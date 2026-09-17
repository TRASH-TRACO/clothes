/**
 * 옷 흔들림 확인.
 *   node --experimental-strip-types bin/check-pendulum.ts
 */
import {
  angleAt,
  cssDegrees,
  GRAVITY,
  period,
  pull,
  release,
  restAngle,
  step,
  type Shape,
  type Swing,
} from "../lib/pendulum.ts";

const shirt: Shape = { length: 40, drag: 0.8, damping: 0.9 };
const coat: Shape = { length: 80, drag: 0.5, damping: 1.1 };

const DT = 1 / 60;

/** 초 단위로 돌린다 */
function run(start: Swing, shape: Shape, wind: number | ((t: number) => number), seconds: number) {
  let state = start;
  const frames = Math.round(seconds / DT);
  for (let i = 0; i < frames; i += 1) {
    const w = typeof wind === "function" ? wind(i * DT) : wind;
    state = step(state, shape, w, DT);
  }
  return state;
}

/**
 * 반주기: 0을 지나고 다음에 0을 지나기까지.
 *
 * 멈춘 자리에서 처음 0까지를 재면 안 된다 — 그건 1/4 주기이고, 마찰 때문에
 * 첫 스윙만 유독 느리다 (잰 값 0.70초 vs 1/4 주기 0.56초). 0에서 0까지를 재야
 * 계산값과 견줄 수 있다.
 */
function halfPeriod(shape: Shape) {
  let state: Swing = { angle: 0.2, speed: 0 };
  let first = 0;
  for (let i = 1; i <= 60 * 10; i += 1) {
    const next = step(state, shape, 0, DT);
    const crossed = (state.angle > 0 && next.angle <= 0) || (state.angle < 0 && next.angle >= 0);
    if (crossed) {
      if (first) return i * DT - first;
      first = i * DT;
    }
    state = next;
  }
  return Infinity;
}

const still = run({ angle: 0, speed: 0 }, shirt, 0, 3);
const pushed = run({ angle: 0, speed: 0 }, shirt, 300, 0.3);
const settled = run({ angle: 0.5, speed: 0 }, shirt, 0, 30);
const held = run({ angle: 0, speed: 0 }, shirt, 200, 30);
const loose = run({ angle: 0.4, speed: 0 }, { ...shirt, damping: 0.3 }, 0, 4);
const tight = run({ angle: 0.4, speed: 0 }, { ...shirt, damping: 3 }, 0, 4);
const huge = step({ angle: 0.3, speed: 0 }, shirt, 5000, 5);
const blown = run({ angle: 0, speed: 0 }, shirt, 100000, 5);

// 손을 따라가다 멎으면, 관성으로 넘어갔다가 되돌아온다
let overshoot = 0;
{
  let state: Swing = { angle: 0, speed: 0 };
  // 0.4초 동안 밀고 그 뒤로는 바람을 끊는다
  for (let i = 0; i < 60 * 2; i += 1) {
    state = step(state, shirt, i * DT < 0.4 ? 400 : 0, DT);
    overshoot = Math.min(overshoot, state.angle);
  }
}

/**
 * 당겼다 놓고 나서 가장 멀리 간 각도.
 *
 * 형님이 물은 게 바로 이거다 — 당긴 데보다 높이 올라가면 안 된다.
 *
 * @param to 어디까지 끌고 갈지 (라디안)
 * @param letGoAt 어디서 손을 놓을지. to 보다 작으면 "끌고 오다가 도중에 놓기" 다
 */
function swungTo(to: number, letGoAt = to, shape: Shape = shirt) {
  let state: Swing = { angle: 0, speed: 0 };
  let peak = 0;

  // 손이 0 에서 to 까지 0.5초 동안 끌고 간다
  const dragFrames = Math.round(0.5 / DT);
  for (let i = 1; i <= dragFrames; i += 1) {
    const target = (to * i) / dragFrames;
    state = pull(state, target, DT);
    peak = Math.max(peak, Math.abs(state.angle));
    // 놓기로 한 자리를 지나면 거기서 손을 뗀다
    if (Math.abs(state.angle) >= Math.abs(letGoAt)) break;
  }

  state = release(state, shape, peak);

  let most = Math.abs(state.angle);
  for (let i = 0; i < 60 * 12; i += 1) {
    state = step(state, shape, 0, DT);
    most = Math.max(most, Math.abs(state.angle));
  }
  return { peak, most, rest: state.angle };
}

const pulled = swungTo(0.6);
const flicked = swungTo(0.6, 0.1);

const checks: [string, boolean][] = [
  ["가만히 두면 그대로", still.angle === 0 && still.speed === 0],
  ["바람이 불면 그쪽으로 밀린다", pushed.angle > 0.05],
  ["바람 반대로 불면 반대로", run({ angle: 0, speed: 0 }, shirt, -300, 0.3).angle < -0.05],
  ["바람이 멎으면 제자리로 돌아온다", Math.abs(settled.angle) < 0.01 && Math.abs(settled.speed) < 0.01],
  ["바람이 계속 불면 어딘가에 멈춰 선다", Math.abs(held.angle - restAngle(shirt, 200)) < 0.02],
  ["멈추는 각도는 바람이 셀수록 크다", restAngle(shirt, 400) > restAngle(shirt, 200)],

  ["마찰이 크면 더 빨리 멎는다", Math.abs(tight.angle) < Math.abs(loose.angle)],

  // 주기는 2π√(L/g). 길게 걸린 옷일수록 느리다.
  ["길게 걸린 옷이 더 느리게 흔들린다", halfPeriod(coat) > halfPeriod(shirt)],
  // 마찰이 있으면 주기가 조금 길어진다. 5% 안쪽이면 계산대로 도는 것이다.
  ["잰 반주기가 계산값과 맞는다 (±8%)", Math.abs(halfPeriod(shirt) - period(shirt) / 2) / (period(shirt) / 2) < 0.08],
  ["마찰 때문에 조금 느려진다 (빨라지지는 않는다)", halfPeriod(shirt) > period(shirt) / 2],
  ["주기 계산이 √L 을 따른다", Math.abs(period(coat) / period(shirt) - Math.SQRT2) < 0.01],
  ["보기 좋은 주기대(2~3초)", period({ length: 40, drag: 1, damping: 1 }) > 2 && period({ length: 80, drag: 1, damping: 1 }) < 3.2],

  ["손을 멈추면 관성으로 되넘어온다", overshoot < -0.02],

  // 탭을 갔다 오면 dt 가 몇 초씩 들어온다. 그래도 안 터져야 한다.
  ["긴 dt 를 줘도 안 터진다", Number.isFinite(huge.angle) && Math.abs(huge.angle) <= 1.2],
  ["말도 안 되는 바람에도 한계를 안 넘는다", Math.abs(blown.angle) <= 1.2 && Number.isFinite(blown.speed)],

  ["중력은 화면용 값", GRAVITY > 0 && GRAVITY < 1000],

  // 손가락 자리를 각도로
  ["손이 제자리면 각도도 0", angleAt(shirt, 0) === 0],
  ["오른쪽으로 빼면 오른쪽으로", angleAt(shirt, 20) > 0],
  ["줄 길이만큼 빼면 90도", Math.abs(angleAt(shirt, shirt.length) - Math.PI / 2) < 1e-9],
  ["줄보다 멀리는 못 간다", angleAt(shirt, 9999) === angleAt(shirt, shirt.length)],
  ["좌우가 대칭", angleAt(shirt, -20) === -angleAt(shirt, 20)],

  // 끌려가는 동안
  ["손을 따라간다", pull({ angle: 0, speed: 0 }, 0.3, DT).angle === 0.3],
  ["속도는 움직인 만큼만", Math.abs(pull({ angle: 0, speed: 0 }, 0.3, DT).speed - 0.3 / DT) < 1e-9],
  ["가만히 잡고 있으면 속도 0", pull({ angle: 0.3, speed: 5 }, 0.3, DT).speed === 0],
  ["한계 밖으로는 못 끈다", pull({ angle: 0, speed: 0 }, 9, DT).angle <= 1.2],

  // **형님이 물은 것** — 당긴 데보다 높이 올라가지 않는다
  ["끝에서 놓으면 그 자리에서 떨어진다", release({ angle: 0.6, speed: 40 }, shirt, 0.6).speed === 0],
  ["당긴 데까지만 올라간다", pulled.most <= pulled.peak + 0.01],
  ["당겼으면 그만큼은 흔들린다", pulled.most > pulled.peak * 0.9],
  ["도중에 세게 놓아도 당긴 데를 안 넘는다", flicked.most <= flicked.peak + 0.01],
  ["느리게 놓으면 속도를 안 깎는다", release({ angle: 0, speed: 0.4 }, shirt, 0.6).speed === 0.4],
  ["빠르게 놓으면 깎인다", release({ angle: 0, speed: 99 }, shirt, 0.6).speed < 99],
  ["깎여도 방향은 그대로", release({ angle: 0, speed: -99 }, shirt, 0.6).speed < 0],
  ["결국 제자리로 돌아온다", Math.abs(pulled.rest) < 0.02],

  // **형님이 말한 것** — 손과 옷이 반대로 움직이면 안 된다.
  // CSS 의 rotate 는 시계방향이 양수라, 매달린 것은 시계방향으로 돌면 왼쪽으로 간다.
  // (브라우저에서 재 봤다: transform-origin:top 인 칸을 +30deg 돌리니 추가 왼쪽으로 40px)
  ["오른쪽으로 당기면 각도가 양수", angleAt(shirt, 20) > 0],
  ["오른쪽으로 당기면 화면 각도는 음수", cssDegrees(angleAt(shirt, 20)) < 0],
  ["왼쪽으로 당기면 화면 각도는 양수", cssDegrees(angleAt(shirt, -20)) > 0],
  ["똑바로 서면 0", cssDegrees(0) === 0],
  ["크기는 그대로 (라디안→도)", Math.abs(Math.abs(cssDegrees(Math.PI / 6)) - 30) < 1e-9],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
