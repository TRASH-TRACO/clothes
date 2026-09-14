/**
 * 봉에 걸린 옷의 흔들림.
 *
 * 옷 하나를 **진자**로 본다. 걸린 자리가 축이고, 옷 무게중심이 추다.
 *
 * 손은 바람이 아니라 **물건**이다. 옷걸이 사이로 손을 훑으면 옷이 손 앞으로
 * 밀렸다가 손이 지나가면 놓여나 흔들린다 — 그 그림이다 (shove).
 * step 은 손이 안 닿을 때 스스로 흔들리는 부분이다.
 *
 * 아무것도 안 물게 해 뒀다 (bin/check-pendulum.ts 에서 바로 돌린다).
 */

export type Swing = {
  /** 각도 (라디안). 0 이 똑바로 아래 */
  angle: number;
  /** 각속도 (rad/s) */
  speed: number;
};

export type Shape = {
  /**
   * 축에서 무게중심까지 (px). 진자의 길이다.
   * 주기가 2π√(L/g) 라서 **길게 걸린 옷일수록 천천히** 흔들린다 — 실제로도 그렇다.
   */
  length: number;
  /**
   * 바람을 얼마나 받는지. 넓고 가벼운 옷일수록 크다 (면적/무게).
   * 단위는 1/s — 바람 속도(px/s)에 곱해 각가속도(rad/s²)가 된다.
   */
  drag: number;
  /** 공기 저항과 고리 마찰. 클수록 빨리 멎는다 (1/s) */
  damping: number;
};

/**
 * 중력 (px/s²).
 *
 * 9.8m/s² 가 아니다. 화면 크기가 실제 옷장이 아니라서, 걸린 길이(35~55px)에서
 * 2~2.7초쯤의 주기가 나오도록 고른 값이다. 그보다 빠르면 안절부절못해 보이고
 * 느리면 멈춘 것처럼 보인다.
 */
export const GRAVITY = 320;

/**
 * 한 번에 밀어 볼 수 있는 시간 (초).
 *
 * 탭을 다른 데 갔다 오면 dt 가 몇 초씩 들어온다. 그대로 적분하면 각도가 튀어
 * 옷이 봉 위로 넘어간다. 이보다 길면 잘라서 여러 번 민다.
 */
const MAX_DT = 1 / 90;

/** 안전 한계. 여기까지 가면 속도를 죽인다 — 봉 위로 넘어가는 그림은 없다 */
const MAX_ANGLE = 1.2;

/** 손에 밀려 옷이 낼 수 있는 가로 속도 한계 (px/s). 손가락은 이보다 훨씬 빠르게도 지나간다 */
const MAX_CARRY = 950;

/**
 * 많이 기울었을 때 cos 이 0 에 가까워지면서 0 으로 나누게 된다.
 * 그 자리에서는 옷이 가로로 거의 안 움직이니 각도로 바꾸는 계산도 의미가 없다.
 */
const MIN_COS = 0.25;

/**
 * 한 걸음.
 *
 * θ'' = −(g/L)·sinθ        중력이 제자리로 당긴다
 *       + (drag/L)·(바람 − 옷의 가로 속도)·cosθ   바람이 옆에서 민다
 *       − damping·θ'                             마찰이 깎는다
 *
 * 바람 항에서 **옷의 가로 속도를 빼는 게 핵심**이다. 옷이 이미 바람과 같은
 * 속도로 가고 있으면 더 밀리지 않는다 — 그래서 손을 따라가다 멈추고, 손이
 * 멎으면 관성으로 넘어갔다가 되돌아온다.
 *
 * @param wind 바람 (px/s). 오른쪽이 양수
 */
export function step(state: Swing, shape: Shape, wind: number, dt: number): Swing {
  const slices = Math.min(Math.ceil(dt / MAX_DT), 12);
  const h = Math.min(dt, MAX_DT * 12) / slices;

  let { angle, speed } = state;
  for (let i = 0; i < slices; i += 1) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    // 추의 가로 속도. 바람과 견주려면 같은 단위(px/s)여야 한다
    const across = speed * shape.length * cos;

    const acc =
      -(GRAVITY / shape.length) * sin +
      (shape.drag / shape.length) * (wind - across) * cos -
      shape.damping * speed;

    // 반음함차분: 속도를 먼저 갱신하고 그 속도로 각도를 옮긴다.
    // 그냥 오일러보다 에너지가 덜 새서 오래 돌려도 안 부푼다.
    speed += acc * h;
    angle += speed * h;

    if (angle > MAX_ANGLE) {
      angle = MAX_ANGLE;
      if (speed > 0) speed = 0;
    } else if (angle < -MAX_ANGLE) {
      angle = -MAX_ANGLE;
      if (speed < 0) speed = 0;
    }
  }
  return { angle, speed };
}

/** 이 바람이 계속 불면 옷이 결국 멈춰 서는 각도 (라디안) */
export function restAngle(shape: Shape, wind: number): number {
  // 멈춘 상태에서는 θ'=0 이라 바람 항이 (drag/L)·wind·cosθ 로 줄어든다.
  //   (g/L)·sinθ = (drag/L)·wind·cosθ  →  tanθ = drag·wind/g
  return Math.atan((shape.drag * wind) / GRAVITY);
}

/** 작게 흔들릴 때의 주기 (초). 길게 걸린 옷일수록 길다 */
export function period(shape: Shape): number {
  return 2 * Math.PI * Math.sqrt(shape.length / GRAVITY);
}

/**
 * 손가락이 옷을 밀어낸다.
 *
 * 바람처럼 살살 미는 게 아니라 **닿아서 치우는** 것이다. 손가락이 파고든 만큼
 * 옷을 밖으로 내보내고, 미는 동안은 손 속도로 따라가게 한다. 손이 지나가면
 * 그 속도를 그대로 들고 놓여나므로 크게 한 번 넘어갔다가 되돌아온다.
 *
 * @param gap 옷 한가운데 − 손가락 (px, 가로). 양수면 옷이 손 오른쪽에 있다
 * @param reach 손가락 반지름 + 옷 반너비 (px). |gap| 이 이보다 작으면 닿은 것
 * @param handSpeed 손가락 가로 속도 (px/s)
 */
export function shove(state: Swing, shape: Shape, gap: number, reach: number, handSpeed: number): Swing {
  // 각도 1rad 당 옷이 가로로 움직이는 거리. 각도와 px 을 오가는 환율이다.
  const arm = shape.length * Math.max(Math.cos(state.angle), MIN_COS);

  // 어느 쪽으로 치울까. 이미 치우쳐 있으면 그쪽으로, 딱 겹쳐 있으면 손이 가는 쪽으로.
  const side = Math.abs(gap) > 1 ? Math.sign(gap) : Math.sign(handSpeed) || 1;
  // 손가락 밖으로 나가려면 이만큼 옮겨야 한다
  const push = side * reach - gap;

  const carry = Math.max(-MAX_CARRY, Math.min(MAX_CARRY, handSpeed));
  let angle = state.angle + push / arm;
  let speed = carry / arm;

  if (angle > MAX_ANGLE) {
    angle = MAX_ANGLE;
    if (speed > 0) speed = 0;
  } else if (angle < -MAX_ANGLE) {
    angle = -MAX_ANGLE;
    if (speed < 0) speed = 0;
  }
  return { angle, speed };
}

/** 옷 한가운데가 축에서 가로로 얼마나 벗어나 있는지 (px) */
export function offsetX(state: Swing, shape: Shape): number {
  return shape.length * Math.sin(state.angle);
}

/** 옷 한가운데가 축에서 아래로 얼마나 내려와 있는지 (px) */
export function offsetY(state: Swing, shape: Shape): number {
  return shape.length * Math.cos(state.angle);
}
