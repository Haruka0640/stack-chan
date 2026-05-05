import Timer from 'timer'

const panelSkin = new Skin({ fill: '#20242a' })
const buttonSkin = new Skin({ fill: '#f4f7fb' })
const pressedSkin = new Skin({ fill: '#a9d8ff' })
const accentSkin = new Skin({ fill: '#ffe08a' })
const statusSkin = new Skin({ fill: '#303844' })

const titleStyle = new Style({ font: '16px Open Sans', color: '#f4f7fb', horizontal: 'center' })
const buttonStyle = new Style({ font: '16px Open Sans', color: '#17202a', horizontal: 'center', vertical: 'middle' })
const statusStyle = new Style({ font: 'k8x12-12', color: '#f4f7fb', horizontal: 'center', vertical: 'middle' })

let sweepTimer = null

function rotation(y, p) {
  return { y, p, r: 0 }
}

function setStatus(root, text) {
  const status = root.content('status')
  if (status) status.string = text
  trace(`[servo_debug] ${text}\n`)
}

async function runMove(root, robot, label, ori, time = 0.35) {
  setStatus(root, `Move ${label}`)
  try {
    await robot.driver.setTorque(true)
    await robot.driver.applyRotation(ori, time)
    setStatus(root, `OK ${label}`)
  } catch (err) {
    setStatus(root, `ERR ${label}`)
    trace(`[servo_debug] move failed: ${String(err)}\n`)
  }
}

function stopSweep(root) {
  if (sweepTimer != null) {
    Timer.clear(sweepTimer)
    sweepTimer = null
    setStatus(root, 'Sweep stopped')
  }
}

function startSweep(root, robot) {
  stopSweep(root)
  const poses = [
    ['Left', rotation(0.35, 0)],
    ['Center', rotation(0, 0)],
    ['Right', rotation(-0.35, 0)],
    ['Center', rotation(0, 0)],
    ['Up', rotation(0, 0.16)],
    ['Center', rotation(0, 0)],
    ['Down', rotation(0, -0.28)],
    ['Center', rotation(0, 0)],
  ]
  let index = 0
  setStatus(root, 'Sweep started')
  sweepTimer = Timer.repeat(() => {
    const pose = poses[index]
    runMove(root, robot, pose[0], pose[1], 0.45)
    index = (index + 1) % poses.length
  }, 800)
}

const DebugButton = Container.template(($) => ({
  left: $.left,
  top: $.top,
  width: $.width ?? 74,
  height: $.height ?? 38,
  active: true,
  skin: $.accent ? accentSkin : buttonSkin,
  contents: [
    new Label(null, {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      string: $.label,
      style: buttonStyle,
    }),
  ],
  Behavior: class extends Behavior {
    onTouchBegan(content) {
      content.skin = pressedSkin
    }
    onTouchCancelled(content) {
      content.skin = $.accent ? accentSkin : buttonSkin
    }
    onTouchEnded(content) {
      content.skin = $.accent ? accentSkin : buttonSkin
      $.action?.()
    }
  },
}))

function createPanel(robot) {
  let root
  root = new Container(null, {
    left: 0,
    right: 0,
    bottom: 0,
    height: 118,
    active: true,
    skin: panelSkin,
    contents: [
      new Label(null, {
        left: 6,
        right: 6,
        top: 4,
        height: 18,
        string: 'Servo Debug',
        style: titleStyle,
      }),
      new Label(null, {
        name: 'status',
        left: 8,
        right: 8,
        bottom: 6,
        height: 20,
        string: 'Ready',
        skin: statusSkin,
        style: statusStyle,
      }),
    ],
  })

  const moves = [
    { label: 'Left', left: 8, top: 26, action: () => runMove(root, robot, 'Left', rotation(0.35, 0)) },
    { label: 'Center', left: 86, top: 26, accent: true, action: () => runMove(root, robot, 'Center', rotation(0, 0)) },
    { label: 'Right', left: 164, top: 26, action: () => runMove(root, robot, 'Right', rotation(-0.35, 0)) },
    { label: 'Up', left: 242, top: 26, action: () => runMove(root, robot, 'Up', rotation(0, 0.16)) },
    { label: 'Down', left: 8, top: 68, action: () => runMove(root, robot, 'Down', rotation(0, -0.28)) },
    { label: 'Sweep', left: 86, top: 68, accent: true, action: () => startSweep(root, robot) },
    { label: 'Stop', left: 164, top: 68, action: () => stopSweep(root) },
    {
      label: 'Torque',
      left: 242,
      top: 68,
      action: async () => {
        stopSweep(root)
        setStatus(root, 'Torque off')
        try {
          await robot.driver.setTorque(false)
        } catch (err) {
          setStatus(root, 'ERR torque')
          trace(`[servo_debug] torque failed: ${String(err)}\n`)
        }
      },
    },
  ]

  for (const spec of moves) {
    root.add(new DebugButton(spec))
  }
  return root
}

export function onRobotCreated(robot) {
  const panel = createPanel(robot)
  const application = robot.renderer.application
  application.add(panel)
  setStatus(panel, 'Tap a button')
}
