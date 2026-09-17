/**
 * 봉에 걸린 옷의 흔들림.
 *
 * 옷 하나를 **진자**로 본다. 걸린 자리가 축이고, 옷 무게중심이 추다.
 *
 * 손은 **진자를 당기는 손**이다. 옷을 잡아 옆으로 끌었다가 놓으면 그때부터 진자로
 * 돈다 (angleAt → pull → release). step 은 손을 놓은 뒤 스스로 흔들리는 부분이다.
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
 * 손가락이 이 자리에 있을 때 옷이 놓이는 각도.
 *
 * 줄에 매달린 것이라 길이보다 멀리는 못 간다. 손을 아무리 옆으로 빼도
 * 90도(옆으로 누운 자리)가 끝이다.
 *
 * @param reach 손가락 − 걸린 자리 (px, 가로)
 */
export function angleAt(shape: Shape, reach: number): number {
  return Math.asin(Math.max(-1, Math.min(1, reach / shape.length)));
}

/**
 * 끌려가는 동안.
 *
 * 손이 잡고 있으니 중력은 일하지 않는다 — 손이 가는 자리로 그냥 따라간다.
 * **속도는 실제로 움직인 만큼만** 갖는다. 손 속도를 따로 얹지 않는다 —
 * 그러면 없던 힘이 생겨서 놓았을 때 당긴 데보다 높이 올라간다.
 */
export function pull(state: Swing, target: number, dt: number): Swing {
  const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, target));
  return { angle, speed: dt > 0 ? (angle - state.angle) / dt : 0 };
}

/**
 * 손을 놓을 때.
 *
 * **당긴 데보다 높이 올라가지 않게** 속도를 깎는다. 진자가 올라갈 수 있는 높이는
 * 가진 에너지가 정한다.
 *
 *   ½(Lω)² + gL(1−cosθ) = gL(1−cos θ_max)
 *   →  ω² = 2g(cosθ − cos θ_max)/L
 *
 * 그래서 지금 각도 θ 에서 θ_max 까지만 올라가려면 속도가 이 값을 넘으면 안 된다.
 * 손을 끝에서 놓으면(θ = θ_max) 0 이 되어 그 자리에서 조용히 떨어진다.
 *
 * @param peak 끌고 다니는 동안 가 본 가장 먼 각도 (라디안)
 */
export function release(state: Swing, shape: Shape, peak: number): Swing {
  const limit = Math.min(Math.abs(peak), MAX_ANGLE);
  const gain = Math.cos(state.angle) - Math.cos(limit);
  if (gain <= 0) return { angle: state.angle, speed: 0 };

  const most = Math.sqrt((2 * GRAVITY * gain) / shape.length);
  return { angle: state.angle, speed: Math.max(-most, Math.min(most, state.speed)) };
}

/**
 * 화면에 쓸 각도 (도). **부호가 뒤집힌다.**
 *
 * 여기서는 오른쪽이 양수다 (angleAt 이 손가락 − 축을 그대로 받는다). 그런데 CSS 의
 * rotate 는 시계방향이 양수라, 매달린 것을 시계방향으로 돌리면 **왼쪽**으로 간다
 * (시계의 6시에서 7시로 가는 쪽). 그대로 쓰면 손과 옷이 정반대로 움직인다.
 *
 * 부딪히는지 보는 계산(offsetX)은 화면 좌표와 같은 부호라야 하므로, 뒤집는 건
 * 그릴 때 이 함수 한 곳에서만 한다.
 */
export function cssDegrees(angle: number): number {
  return (-angle * 180) / Math.PI;
}

/** 옷 한가운데가 축에서 가로로 얼마나 벗어나 있는지 (px) */
export function offsetX(state: Swing, shape: Shape): number {
  return shape.length * Math.sin(state.angle);
}

/** 옷 한가운데가 축에서 아래로 얼마나 내려와 있는지 (px) */
export function offsetY(state: Swing, shape: Shape): number {
  return shape.length * Math.cos(state.angle);
}
