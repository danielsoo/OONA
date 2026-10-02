import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState, type ReactNode } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import {
  adjustZoom,
  computeObjectContainRect,
  cropToFrameRect,
  frameRectToCrop,
  PROMO_CROP_MAX_ZOOM,
  PROMO_CROP_MIN_ZOOM,
  type Rect,
} from "@/lib/works/promo-crop-interaction-pure";
import type { PromoFrameCrop } from "@/types/work";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

const ZOOM_STEP = 0.1;

/**
 * Drag a frame of `frameAspect` over a media preview, with − / ＋ zoom.
 * Uses the website's crop math (promo-crop-interaction-pure), so the saved
 * focal point and zoom mean the same thing on both. `children` is the media,
 * drawn with contain-fit to fill the box.
 */
export function CropFrameEditor({
  sourceWidth,
  sourceHeight,
  frameAspect,
  crop,
  onChange,
  label,
  children,
}: {
  sourceWidth: number;
  sourceHeight: number;
  frameAspect: number;
  crop: PromoFrameCrop;
  onChange: (crop: PromoFrameCrop) => void;
  label: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const display: Rect = computeObjectContainRect({
    containerWidth: box.width,
    containerHeight: box.height,
    videoWidth: sourceWidth,
    videoHeight: sourceHeight,
  });
  const frame = box.width > 0 ? cropToFrameRect(crop, display, frameAspect) : null;

  // PanResponder is created once; read the latest values through a ref.
  const latest = useRef({ crop, display, frame, onChange, frameAspect });
  latest.current = { crop, display, frame, onChange, frameAspect };
  const start = useRef<Rect | null>(null);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the parent ScrollView from stealing the drag.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = latest.current.frame;
      },
      onPanResponderMove: (_, g) => {
        const s = start.current;
        if (!s) return;
        const { crop: c, display: d, onChange: emit, frameAspect: aspect } = latest.current;
        const moved = { ...s, left: s.left + g.dx, top: s.top + g.dy };
        emit(frameRectToCrop(moved, d, c.zoom, aspect));
      },
      onPanResponderRelease: () => {
        start.current = null;
      },
    })
  ).current;

  function zoom(delta: number) {
    const next = adjustZoom(crop.zoom, delta);
    if (!frame) return onChange({ ...crop, zoom: next });
    // Zoom around the current frame center.
    onChange(frameRectToCrop(frame, display, next, frameAspect));
  }

  return (
    <View style={{ gap: space(2) }}>
      <View
        style={styles.box}
        onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {children}
        {frame ? (
          <>
            {/* Dim everything outside the frame. */}
            <View pointerEvents="none" style={[styles.shade, { left: 0, top: 0, right: 0, height: frame.top }]} />
            <View pointerEvents="none" style={[styles.shade, { left: 0, right: 0, top: frame.top + frame.height, bottom: 0 }]} />
            <View pointerEvents="none" style={[styles.shade, { left: 0, width: frame.left, top: frame.top, height: frame.height }]} />
            <View
              pointerEvents="none"
              style={[styles.shade, { left: frame.left + frame.width, right: 0, top: frame.top, height: frame.height }]}
            />
            <View
              {...pan.panHandlers}
              accessibilityLabel={label}
              accessibilityHint={t("uploader.promoCropHint")}
              style={[styles.frame, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }]}
            />
          </>
        ) : null}
      </View>
      <View style={styles.controls}>
        <Pressable
          onPress={() => zoom(-ZOOM_STEP)}
          disabled={crop.zoom <= PROMO_CROP_MIN_ZOOM}
          accessibilityRole="button"
          accessibilityLabel={t("uploader.promoCropZoomOut")}
          hitSlop={8}
          style={styles.zoomButton}
        >
          <Ionicons name="remove" size={20} color={crop.zoom <= PROMO_CROP_MIN_ZOOM ? colors.ink4 : colors.ink} />
        </Pressable>
        <Text style={styles.readout}>
          {t("uploader.promoCropZoom")} {crop.zoom.toFixed(1)}×
        </Text>
        <Pressable
          onPress={() => zoom(ZOOM_STEP)}
          disabled={crop.zoom >= PROMO_CROP_MAX_ZOOM}
          accessibilityRole="button"
          accessibilityLabel={t("uploader.promoCropZoomIn")}
          hitSlop={8}
          style={styles.zoomButton}
        >
          <Ionicons name="add" size={20} color={crop.zoom >= PROMO_CROP_MAX_ZOOM ? colors.ink4 : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: "100%", aspectRatio: 1, borderRadius: radius.card, overflow: "hidden", backgroundColor: "#000" },
  shade: { position: "absolute", backgroundColor: "rgba(0,0,0,0.55)" },
  frame: { position: "absolute", borderWidth: 2, borderColor: colors.ink, borderStyle: "dashed", borderRadius: 4 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(4) },
  zoomButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  readout: { ...type.small, color: colors.ink2, minWidth: 96, textAlign: "center", fontVariant: ["tabular-nums"] },
});
