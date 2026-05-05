import { Outline } from 'commodetto/outline'
import {
  CommonView,
  CommonViewBehavior,
  type CommonViewParams,
  type CommonViewTemplateCtor,
  type TemplateFunction,
} from 'common-view'
import { copyFaceContext, createFaceContext, defaultFaceContext, type FaceContext } from 'face-context'
import { type FaceSkinPalette, updateFaceSkinPalette } from 'face-skin'
import {
  Container,
  Die,
  type Container as PiuContainer,
  type Content as PiuContent,
  type Skin as PiuSkin,
  Skin,
} from 'piu/MC'
import type { Shape as PiuShape } from 'piu/shape'

type FaceViewAnchors = {
  FACE?: PiuContainer
  EFFECTS?: PiuContainer
  FACE_REGION?: DieRegion
}

type FaceViewBaseParams = CommonViewParams
type DieRegion = PiuContainer & { set: (x: number, y: number, w: number, h: number) => DieRegion; cut: () => void }
type TouchRipple = {
  active: boolean
  touching: boolean
  x: number
  y: number
  startedAt: number
}
type TouchRippleShape = Omit<PiuShape, 'fillOutline' | 'strokeOutline'> & {
  fillOutline?: Outline
  strokeOutline?: Outline
  skin?: PiuSkin
}
type FaceContainerBehavior = {
  onFaceUpdate?: (container: PiuContainer, face: FaceContext) => void
  rehydrate?: (container: PiuContainer, face: Readonly<FaceContext>, palette?: FaceSkinPalette | null) => void
  getBaseCoordinates?: (container: PiuContainer) => { left: number; top: number }
}

const DRAWER_EDGE_WIDTH = 16
const DRAWER_SWIPE_MIN_DISTANCE = 36
const DRAWER_SWIPE_MAX_VERTICAL_DRIFT = 32
const TOUCH_RIPPLE_DURATION_MS = 400
const TOUCH_RIPPLE_MIN_RADIUS = 6
const TOUCH_RIPPLE_MAX_RADIUS = 46
const TOUCH_RIPPLE_STROKE_WIDTH = 2
const TOUCH_RIPPLE_COLOR = '#a8a8a8'

class DrawerEdgeSwipeBehavior extends Behavior {
  startX = 0
  startY = 0
  startedOnRightEdge = false
  triggered = false

  onTouchBegan(container: PiuContainer, _id: number, x: number, y: number, ticks: number) {
    container.distribute('onTouchRippleStart', x, y, ticks)
    container.bubble('onScreenTouchBegan', x, y, ticks)
    this.startX = x
    this.startY = y
    this.triggered = false
    this.startedOnRightEdge = x >= this.getWidth(container) - DRAWER_EDGE_WIDTH
  }

  onTouchMoved(container: PiuContainer, _id: number, x: number, y: number, ticks: number) {
    container.distribute('onTouchRippleMove', x, y)
    container.bubble('onScreenTouchMoved', x, y, ticks)
    if (this.triggered || !this.startedOnRightEdge) return

    const dx = x - this.startX
    const dy = Math.abs(y - this.startY)
    if (dx <= -DRAWER_SWIPE_MIN_DISTANCE && dy <= DRAWER_SWIPE_MAX_VERTICAL_DRIFT) {
      this.triggered = true
      trace(`[FaceMain] drawer edge swipe x=${this.startX}->${x} y=${this.startY}->${y}\n`)
      container.bubble('onDrawerOpen')
    }
  }

  onTouchEnded(container: PiuContainer, _id: number, x: number, y: number, ticks: number) {
    container.distribute('onTouchRippleEnd', x, y)
    container.bubble('onScreenTouchEnded', x, y, ticks)
    this.startedOnRightEdge = false
    this.triggered = false
  }

  onTouchCancelled(container: PiuContainer) {
    container.distribute('onTouchRippleCancel')
    this.startedOnRightEdge = false
    this.triggered = false
  }

  private getWidth(container: PiuContainer): number {
    return container.width ?? container.bounds?.width ?? 0
  }
}

const TouchRippleLayer = Shape.template((_data: object) => ({
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  active: false,
  visible: false,
  skin: new Skin({ stroke: TOUCH_RIPPLE_COLOR }),
  Behavior: class extends Behavior {
    ripple: TouchRipple = {
      active: false,
      touching: false,
      x: 0,
      y: 0,
      startedAt: 0,
    }

    onCreate(shape: TouchRippleShape) {
      shape.duration = TOUCH_RIPPLE_DURATION_MS
    }

    onFaceSkin(shape: TouchRippleShape, _palette: FaceSkinPalette) {
      shape.skin = new Skin({ stroke: TOUCH_RIPPLE_COLOR })
      shape.state = 0
    }

    onTouchRippleStart(shape: TouchRippleShape, x: number, y: number, ticks: number) {
      this.ripple.active = true
      this.ripple.touching = true
      this.ripple.x = x
      this.ripple.y = y
      this.ripple.startedAt = ticks
      shape.visible = true
      shape.duration = TOUCH_RIPPLE_DURATION_MS
      shape.time = 0
      this.updatePath(shape, 0)
      shape.start()
    }

    onTouchRippleMove(shape: TouchRippleShape, x: number, y: number) {
      if (!this.ripple.active) return
      this.ripple.x = x
      this.ripple.y = y
      this.updatePath(shape, this.currentFraction(shape))
    }

    onTouchRippleEnd(shape: TouchRippleShape, x: number, y: number) {
      if (!this.ripple.active) return
      this.ripple.touching = false
      this.ripple.x = x
      this.ripple.y = y
      if (!shape.running) {
        shape.time = Math.min(shape.time ?? 0, TOUCH_RIPPLE_DURATION_MS - 1)
        shape.start()
      }
      this.updatePath(shape, this.currentFraction(shape))
    }

    onTouchRippleCancel(shape: TouchRippleShape) {
      if (!this.ripple.active) return
      this.ripple.touching = false
      if (!shape.running) {
        shape.time = Math.min(shape.time ?? 0, TOUCH_RIPPLE_DURATION_MS - 1)
        shape.start()
      }
    }

    onTimeChanged(shape: TouchRippleShape) {
      this.updatePath(shape, this.currentFraction(shape))
    }

    onFinished(shape: TouchRippleShape) {
      if (this.ripple.touching) {
        shape.time = TOUCH_RIPPLE_DURATION_MS - 1
        shape.start()
        return
      }
      this.ripple.active = false
      shape.visible = false
      shape.strokeOutline = undefined
    }

    currentFraction(shape: TouchRippleShape): number {
      return this.ripple.touching ? Math.min(shape.fraction ?? 0, 0.98) : (shape.fraction ?? 0)
    }

    updatePath(shape: TouchRippleShape, fraction: number) {
      if (!this.ripple.active) return
      const clampedFraction = Math.max(0, Math.min(1, fraction))
      const radius = TOUCH_RIPPLE_MIN_RADIUS + (TOUCH_RIPPLE_MAX_RADIUS - TOUCH_RIPPLE_MIN_RADIUS) * clampedFraction
      const path = new Outline.CanvasPath()
      path.arc(this.ripple.x, this.ripple.y, radius, 0, 2 * Math.PI)
      path.closePath()
      shape.fillOutline = undefined
      shape.strokeOutline = Outline.stroke(path, TOUCH_RIPPLE_STROKE_WIDTH)
    }
  },
}))

export type FaceViewParams = FaceViewBaseParams &
  FaceViewAnchors & {
    face?: PiuContainer
    effects?: PiuContainer
    skin?: PiuSkin
  }

export type FaceViewTemplateCtor = TemplateFunction<FaceViewParams, PiuContainer>

class FaceViewBehavior extends CommonViewBehavior {
  face: PiuContainer | null = null
  faceRegion: DieRegion | null = null
  effects: PiuContainer | null = null
  effectsSet = new Set<PiuContent>()
  effectsByKey = new Map<string, PiuContent>()
  effectKeys = new Map<PiuContent, string>()
  autoTheme = true
  lastPalette: FaceSkinPalette | null = null
  lastFaceContext: FaceContext | null = null

  onCreate(container: PiuContainer, data: FaceViewParams) {
    super.onCreate(container, data)
    const main = this.main
    if (!main) {
      throw new Error('[FaceView] missing MAIN container')
    }
    if (!data.FACE || !data.EFFECTS || !data.FACE_REGION) {
      const missing: string[] = []
      if (!data.FACE) missing.push('FACE')
      if (!data.FACE_REGION) missing.push('FACE_REGION')
      if (!data.EFFECTS) missing.push('EFFECTS')
      throw new Error(`[FaceView] missing anchors: ${missing.join(', ')}`)
    }
    this.face = data.FACE
    this.faceRegion = data.FACE_REGION
    this.effects = data.EFFECTS
    this.autoTheme = data.skin === undefined
  }

  onFaceUpdate(_container: PiuContainer, faceContext: Readonly<FaceContext>) {
    if (this.lastFaceContext === null) {
      this.lastFaceContext = createFaceContext()
    }
    copyFaceContext(faceContext, this.lastFaceContext)
    const palette = updateFaceSkinPalette(this.lastPalette, faceContext)
    if (palette !== this.lastPalette) {
      this.onFaceSkin(_container, palette)
    }
    const face = this.face
    const behavior = face?.behavior as FaceContainerBehavior | undefined
    behavior?.onFaceUpdate?.(face as PiuContainer, faceContext as FaceContext)
    this.onFaceContext?.(_container, faceContext as FaceContext)
  }

  onFaceSkin(_container: PiuContainer, palette: FaceSkinPalette) {
    this.lastPalette = palette
    if (this.autoTheme && this.main) {
      this.main.skin = palette.secondary
    }
    this.face?.distribute?.('onFaceSkin', palette)
    if (this.face) {
      this.rehydrateFace(this.face, this.lastFaceContext ?? defaultFaceContext, palette)
    }
    this.effects?.distribute('onFaceSkin', palette)
    this.overlay?.distribute('onFaceSkin', palette)
    this.appBar?.distribute?.('onFaceSkin', palette)
    return true
  }

  onFaceContext(_container: PiuContainer, faceContext: FaceContext) {
    this.effects?.distribute('onFaceContext', faceContext)
    this.overlay?.distribute('onFaceContext', faceContext)
    this.appBar?.distribute?.('onFaceContext', faceContext)
    return true
  }

  addEffect(effect: PiuContent, key?: string): void {
    if (!this.effects) return
    const resolvedKey = key ?? (effect as PiuContent & { name?: string }).name
    if (resolvedKey) {
      const existing = this.effectsByKey.get(resolvedKey)
      if (existing && existing !== effect) {
        this.removeEffect(existing)
      }
      this.effectsByKey.set(resolvedKey, effect)
      this.effectKeys.set(effect, resolvedKey)
    }
    if (this.effectsSet.has(effect)) return
    this.effectsSet.add(effect)
    this.effects.add(effect)
  }

  removeEffect(effect: PiuContent): void {
    if (!this.effects || !this.effectsSet.has(effect)) return
    this.effectsSet.delete(effect)
    effect.stop?.()
    this.effects.remove(effect)
    const key = this.effectKeys.get(effect)
    if (key) {
      this.effectKeys.delete(effect)
      if (this.effectsByKey.get(key) === effect) {
        this.effectsByKey.delete(key)
      }
    }
  }

  removeEffectByKey(key: string): void {
    const effect = this.effectsByKey.get(key)
    if (effect) {
      this.removeEffect(effect)
    }
  }

  rehydrateFace(face: PiuContainer, faceContext: Readonly<FaceContext>, palette = this.lastPalette): void {
    const behavior = face.behavior as FaceContainerBehavior | undefined
    if (behavior?.rehydrate) {
      behavior.rehydrate(face, faceContext, palette)
      return
    }
    behavior?.onFaceUpdate?.(face, faceContext as FaceContext)
  }

  applyFaceState(face: PiuContainer): void {
    const faceContext = this.lastFaceContext ?? defaultFaceContext
    if (this.lastPalette) {
      face.distribute?.('onFaceSkin', this.lastPalette)
    }
    face.distribute?.('onFaceContext', faceContext)
    this.rehydrateFace(face, faceContext, this.lastPalette)
  }

  setFace(face: PiuContainer): void {
    if (!face || this.face === face) return
    const currentFace = this.face
    const currentBehavior = currentFace?.behavior as FaceContainerBehavior | undefined
    const currentParent = currentFace
      ? (((currentFace as PiuContent & { container?: PiuContainer }).container ??
          this.faceRegion) as PiuContainer | null)
      : null
    const currentCoordinates =
      currentFace && currentBehavior?.getBaseCoordinates
        ? currentBehavior.getBaseCoordinates(currentFace)
        : currentFace?.coordinates
          ? { ...currentFace.coordinates }
          : null
    this.face = face
    if (currentCoordinates) {
      face.coordinates = { ...(face.coordinates ?? {}), ...currentCoordinates }
    }

    if (currentFace && currentParent) {
      currentParent.remove(currentFace)
      if (currentParent === this.main && this.effects) {
        currentParent.insert(face, this.effects)
      } else {
        currentParent.add(face)
      }
      this.applyFaceState(face)
      return
    }

    if (this.faceRegion) {
      this.faceRegion.add(face)
      this.applyFaceState(face)
      return
    }

    if (!this.main) return
    if (this.effects) this.main.insert(face, this.effects)
    else this.main.add(face)
    this.applyFaceState(face)
  }
}

export const FaceMainTemplate: TemplateFunction<FaceViewParams, PiuContainer> = Container.template(
  ($: FaceViewParams) => {
    const face = $.face
    if (!face) throw new Error('[FaceMainTemplate] face instance is required')
    if (!$.FACE) {
      $.FACE = face
    }
    const faceBehavior = face.behavior as { breathPixels?: number } | undefined
    const breathPad = Math.max(0, Math.round(faceBehavior?.breathPixels ?? 0))
    const faceCoords = face.coordinates ?? {}
    const faceWidth = face.width ?? face.bounds?.width ?? 0
    const faceHeight = face.height ?? face.bounds?.height ?? 0
    const faceLeft = faceCoords.left ?? (face as PiuContent & { left?: number }).left ?? 0
    const faceTop = faceCoords.top ?? (face as PiuContent & { top?: number }).top ?? 0

    face.coordinates = {
      left: breathPad,
      top: breathPad,
    }

    const faceRegion = new Die($, {
      anchor: 'FACE_REGION',
      left: faceLeft - breathPad,
      top: faceTop - breathPad,
      width: faceWidth + breathPad * 2,
      height: faceHeight + breathPad * 2,
      clip: true,
      Behavior: class extends Behavior {
        onDisplaying(die: DieRegion) {
          die.set(0, 0, die.width, die.height).cut()
        }
      },
    }) as DieRegion

    if (!$.FACE_REGION) {
      $.FACE_REGION = faceRegion
    }
    faceRegion.add(face)
    const effects =
      $.effects ??
      new Container($, { left: 0, right: 0, top: 0, bottom: 0, active: false, clip: false, anchor: 'EFFECTS' })
    if (!$.EFFECTS) {
      $.EFFECTS = effects
    }
    const touchRipple = new TouchRippleLayer($)
    const skin = $.skin ?? new Skin({ fill: defaultFaceContext.theme.secondary })
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      active: true,
      backgroundTouch: true,
      skin,
      contents: [faceRegion, effects, touchRipple],
      Behavior: DrawerEdgeSwipeBehavior,
    }
  },
) as unknown as TemplateFunction<FaceViewParams, PiuContainer>

const CommonViewTemplate: CommonViewTemplateCtor = CommonView
export const FaceView: FaceViewTemplateCtor = CommonViewTemplate.template
  ? (CommonViewTemplate.template(($: FaceViewParams) => {
      if (!$.main && !$.MAIN) {
        if (!$.face) throw new Error('[FaceView] face is required when main is not provided')
        const main = new FaceMainTemplate($, { anchor: 'MAIN' })
        $.main = main
      }
      return { Behavior: FaceViewBehavior }
    }) as unknown as FaceViewTemplateCtor)
  : (CommonViewTemplate as FaceViewTemplateCtor)

export type { FaceViewBehavior }
