'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createElement } from 'react'

// ── Supported locales ──
export type Locale = 'en' | 'ko'

// ── Translation keys ──
export const translations = {
  en: {
    // FileUpload
    'fileUpload.loadNewFile': 'Load New File',
    'fileUpload.loadNewFileAria': 'Load a new track file',
    'fileUpload.title': 'Travelback',
    'fileUpload.subtitle': 'Animate your journeys into video',
    'fileUpload.dropHint': 'Drop your GPX, KML, or Google Location History JSON file here',
    'fileUpload.browseAria': 'Browse files to upload',
    'fileUpload.parsing': 'Parsing...',
    'fileUpload.browse': 'Browse Files',
    'fileUpload.googleGuideLink': 'How to export Google Location History',
    'fileUpload.parseFailed': 'Failed to parse file',

    // Controls
    'controls.pause': 'Pause',
    'controls.play': 'Play',
    'controls.pauseKey': 'Pause (Space)',
    'controls.playKey': 'Play (Space)',
    'controls.playbackSpeed': 'Playback speed',
    'controls.animationDuration': 'Animation duration',
    'controls.cameraFollowOff': 'Enable camera follow',
    'controls.cameraFollowOn': 'Disable camera follow',
    'controls.cameraFollowOnTitle': 'Camera follow: ON (F)',
    'controls.cameraFollowOffTitle': 'Camera follow: OFF (F)',
    'controls.follow': 'Follow',

    // SceneEditor
    'scenes.title': 'Scenes',
    'scenes.add': '+ Add',
    'scenes.presets': 'Presets:',
    'scenes.cinematic': 'Cinematic',
    'scenes.simple': 'Simple',
    'scenes.birdsEye': "Bird's Eye",
    'scenes.dynamic': 'Dynamic',
    'scenes.blend': 'Blend',
    'scenes.blendAria': 'Scene transition blend duration',
    'scenes.startPct': 'Start %',
    'scenes.endPct': 'End %',
    'scenes.zoom': 'Zoom',
    'scenes.pitch': 'Pitch',
    'scenes.bearing': 'Bearing',
    'scenes.rotation': 'Rotation',
    'scenes.emptyState': 'No scenes yet. Click "+ Add" to create one,\nor scenes will be auto-generated on export.',
    'scenes.deleted': 'Deleted',
    'scenes.undo': 'Undo',
    'scenes.hasStartGteEnd': 'has start ≥ end',
    'scenes.overlap': 'and',
    'scenes.overlapSuffix': 'overlap',

    // ExportPanel
    'export.title': 'Export Video',
    'export.rendering': 'Rendering...',
    'export.frame': 'Frame',
    'export.resolution': 'Resolution',
    'export.codec': 'Codec',
    'export.unsupported': '(unsupported)',
    'export.duration': 'Duration',
    'export.fps': 'FPS',
    'export.mbps': 'Mbps',
    'export.output': 'Output:',
    'export.at': 'at',
    'export.startExport': 'Start Export',

    // GoogleGuide
    'google.title': 'Export Google Timeline',
    'google.close': 'Close',
    'google.phoneTab': 'From your phone (recommended)',
    'google.takeoutTab': 'From Google Takeout',
    'google.step1Phone': 'Open Google Maps',
    'google.step1PhoneItem1': 'Tap your profile picture',
    'google.step1PhoneItem2': 'Go to "Your Timeline"',
    'google.step2Phone': 'Export your data',
    'google.step2PhoneItem1': 'Tap ⋮ (more) → Settings → Export Timeline data',
    'google.step2PhoneItem2': 'This downloads a location-history.json file',
    'google.step3Phone': 'Upload to Travelback',
    'google.step3PhoneItem1': 'Drop the JSON file here',
    'google.step3PhoneItem2': 'Use the timeline slider to select a date range',
    'google.step1Takeout': 'Go to Google Takeout',
    'google.step1TakeoutItem1': 'Visit takeout.google.com',
    'google.step1TakeoutItem2': 'Deselect all, then select "Location History"',
    'google.openTakeout': 'Open Google Takeout',
    'google.step2Takeout': 'Download & extract',
    'google.step2TakeoutItem1': 'Create export → wait for email → download zip',
    'google.step2TakeoutItem2': 'Any of these files work: Records.json, Timeline Edits.json, or monthly Semantic Location History files (e.g. 2024_JANUARY.json)',
    'google.step3Takeout': 'Upload to Travelback',
    'google.step3TakeoutItem1': 'Drop any of the JSON files here',
    'google.step3TakeoutItem2': 'Use the timeline slider to select a date range',
    'google.tips': 'Tips',
    'google.tip1': 'Since 2024, Google stores Timeline data on-device — phone export usually has the most complete data',
    'google.tip2': 'Large files (100MB+) may take a moment to parse',
    'google.tip3': 'Use the timeline selector to zoom into specific trips',

    // ElevationProfile
    'elevation.label': 'Elevation',
    'elevation.profileAria': 'Elevation profile',

    // TimelineSelector
    'timeline.points': 'points',

    // JourneyCreator
    'journey.title': 'Create Journey',
    'journey.cancel': 'Cancel',
    'journey.hint': 'Click on the map to add points. Click a point to delete it. Drag to reposition.',
    'journey.noPoints': 'No points yet',
    'journey.onePoint': '1 point',
    'journey.undo': 'Undo',
    'journey.clear': 'Clear',
    'journey.done': 'Done',
    'journey.defaultName': 'Custom Journey',

    // ThemeToggle
    'theme.switchToLight': 'Switch to light mode',
    'theme.switchToDark': 'Switch to dark mode',

    // Toast
    'toast.dismiss': 'Dismiss notification',

    // ErrorBoundary
    'error.title': 'Something went wrong',
    'error.fallback': 'An unexpected error occurred.',
    'error.tryAgain': 'Try Again',
    'error.reloadPage': 'Reload Page',

    // page.tsx
    'app.exportSuccess': 'Video exported successfully!',
    'app.exportCancelled': 'Export cancelled.',
    'app.exportFailed': 'Export failed:',
    'app.exportFailedSuffix': 'Your browser may not support WebCodecs with the selected codec.',
    'app.renderingVideo': 'Rendering video...',
    'app.cancelExport': 'Cancel',
    'app.createJourney': 'or create a journey manually',
    'app.newJourneyAria': 'Create a new journey',
    'app.new': 'New',
    'app.openSceneEditor': 'Open scene editor',
    'app.scenes': 'Scenes',
    'app.cycleMapStyle': 'Cycle map style',
    'app.exportVideoKey': 'Export video (E)',
    'app.export': 'Export',
  },
  ko: {
    // FileUpload
    'fileUpload.loadNewFile': '새 파일 불러오기',
    'fileUpload.loadNewFileAria': '새 트랙 파일 불러오기',
    'fileUpload.title': 'Travelback',
    'fileUpload.subtitle': '여행을 영상으로 만들어보세요',
    'fileUpload.dropHint': 'GPX, KML, 또는 Google 위치 기록 JSON 파일을 여기에 놓으세요',
    'fileUpload.browseAria': '업로드할 파일 선택',
    'fileUpload.parsing': '분석 중...',
    'fileUpload.browse': '파일 선택',
    'fileUpload.googleGuideLink': 'Google 위치 기록 내보내기 방법',
    'fileUpload.parseFailed': '파일을 분석할 수 없습니다',

    // Controls
    'controls.pause': '일시정지',
    'controls.play': '재생',
    'controls.pauseKey': '일시정지 (Space)',
    'controls.playKey': '재생 (Space)',
    'controls.playbackSpeed': '재생 속도',
    'controls.animationDuration': '애니메이션 길이',
    'controls.cameraFollowOff': '카메라 따라가기 켜기',
    'controls.cameraFollowOn': '카메라 따라가기 끄기',
    'controls.cameraFollowOnTitle': '카메라 따라가기: 켜짐 (F)',
    'controls.cameraFollowOffTitle': '카메라 따라가기: 꺼짐 (F)',
    'controls.follow': '따라가기',

    // SceneEditor
    'scenes.title': '장면',
    'scenes.add': '+ 추가',
    'scenes.presets': '프리셋:',
    'scenes.cinematic': '시네마틱',
    'scenes.simple': '심플',
    'scenes.birdsEye': '조감도',
    'scenes.dynamic': '다이나믹',
    'scenes.blend': '전환',
    'scenes.blendAria': '장면 전환 블렌드 길이',
    'scenes.startPct': '시작 %',
    'scenes.endPct': '끝 %',
    'scenes.zoom': '줌',
    'scenes.pitch': '피치',
    'scenes.bearing': '방위',
    'scenes.rotation': '회전',
    'scenes.emptyState': '장면이 없습니다. "+ 추가"를 눌러 생성하거나,\n내보내기 시 자동으로 생성됩니다.',
    'scenes.deleted': '삭제됨',
    'scenes.undo': '되돌리기',
    'scenes.hasStartGteEnd': '의 시작이 끝보다 크거나 같음',
    'scenes.overlap': '과',
    'scenes.overlapSuffix': '이(가) 겹침',

    // ExportPanel
    'export.title': '영상 내보내기',
    'export.rendering': '렌더링 중...',
    'export.frame': '프레임',
    'export.resolution': '해상도',
    'export.codec': '코덱',
    'export.unsupported': '(미지원)',
    'export.duration': '길이',
    'export.fps': 'FPS',
    'export.mbps': 'Mbps',
    'export.output': '출력:',
    'export.at': '',
    'export.startExport': '내보내기 시작',

    // GoogleGuide
    'google.title': 'Google 타임라인 내보내기',
    'google.close': '닫기',
    'google.phoneTab': '휴대폰에서 (권장)',
    'google.takeoutTab': 'Google Takeout에서',
    'google.step1Phone': 'Google 지도 열기',
    'google.step1PhoneItem1': '프로필 사진을 탭하세요',
    'google.step1PhoneItem2': '"내 타임라인"으로 이동하세요',
    'google.step2Phone': '데이터 내보내기',
    'google.step2PhoneItem1': '⋮ (더보기) → 설정 → 타임라인 데이터 내보내기를 탭하세요',
    'google.step2PhoneItem2': 'location-history.json 파일이 다운로드됩니다',
    'google.step3Phone': 'Travelback에 업로드',
    'google.step3PhoneItem1': 'JSON 파일을 여기에 놓으세요',
    'google.step3PhoneItem2': '타임라인 슬라이더로 날짜 범위를 선택하세요',
    'google.step1Takeout': 'Google Takeout으로 이동',
    'google.step1TakeoutItem1': 'takeout.google.com에 접속하세요',
    'google.step1TakeoutItem2': '모두 선택 해제 후 "위치 기록"을 선택하세요',
    'google.openTakeout': 'Google Takeout 열기',
    'google.step2Takeout': '다운로드 및 압축 해제',
    'google.step2TakeoutItem1': '내보내기 생성 → 이메일 대기 → zip 다운로드',
    'google.step2TakeoutItem2': '다음 파일 중 아무거나 사용 가능: Records.json, Timeline Edits.json, 또는 월별 Semantic Location History 파일 (예: 2024_JANUARY.json)',
    'google.step3Takeout': 'Travelback에 업로드',
    'google.step3TakeoutItem1': 'JSON 파일을 여기에 놓으세요',
    'google.step3TakeoutItem2': '타임라인 슬라이더로 날짜 범위를 선택하세요',
    'google.tips': '팁',
    'google.tip1': '2024년부터 Google은 타임라인 데이터를 기기에 저장합니다 — 휴대폰 내보내기가 가장 완전한 데이터를 제공합니다',
    'google.tip2': '대용량 파일(100MB+)은 분석에 시간이 걸릴 수 있습니다',
    'google.tip3': '타임라인 선택기로 특정 여행을 확대하세요',

    // ElevationProfile
    'elevation.label': '고도',
    'elevation.profileAria': '고도 프로필',

    // TimelineSelector
    'timeline.points': '포인트',

    // JourneyCreator
    'journey.title': '여행 만들기',
    'journey.cancel': '취소',
    'journey.hint': '지도를 클릭하여 포인트를 추가하세요. 포인트를 클릭하면 삭제됩니다. 드래그하여 위치를 변경하세요.',
    'journey.noPoints': '포인트 없음',
    'journey.onePoint': '1개 포인트',
    'journey.undo': '되돌리기',
    'journey.clear': '초기화',
    'journey.done': '완료',
    'journey.defaultName': '사용자 여행',

    // ThemeToggle
    'theme.switchToLight': '라이트 모드로 전환',
    'theme.switchToDark': '다크 모드로 전환',

    // Toast
    'toast.dismiss': '알림 닫기',

    // ErrorBoundary
    'error.title': '문제가 발생했습니다',
    'error.fallback': '예기치 않은 오류가 발생했습니다.',
    'error.tryAgain': '다시 시도',
    'error.reloadPage': '페이지 새로고침',

    // page.tsx
    'app.exportSuccess': '영상이 성공적으로 내보내졌습니다!',
    'app.exportCancelled': '내보내기가 취소되었습니다.',
    'app.exportFailed': '내보내기 실패:',
    'app.exportFailedSuffix': '브라우저가 선택한 코덱의 WebCodecs를 지원하지 않을 수 있습니다.',
    'app.renderingVideo': '영상 렌더링 중...',
    'app.cancelExport': '취소',
    'app.createJourney': '또는 직접 여행 만들기',
    'app.newJourneyAria': '새 여행 만들기',
    'app.new': '새로 만들기',
    'app.openSceneEditor': '장면 편집기 열기',
    'app.scenes': '장면',
    'app.cycleMapStyle': '지도 스타일 변경',
    'app.exportVideoKey': '영상 내보내기 (E)',
    'app.export': '내보내기',
  },
} satisfies Record<Locale, Record<string, string>>

// ── Translation key type ──
export type TranslationKey = keyof typeof translations.en

// ── Detect browser locale ──
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language || ''
  if (lang === 'ko-KR' || lang === 'ko') return 'ko'
  return 'en'
}

// ── Translation function ──
export function t(key: TranslationKey, locale: Locale = 'en'): string {
  return translations[locale][key] || translations.en[key] || key
}

// ── React Context ──
export interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => translations.en[key] || key,
})

// ── Provider component ──
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const detected = detectLocale()
    setLocaleState(detected)
    document.documentElement.setAttribute('lang', detected)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    document.documentElement.setAttribute('lang', l)
  }, [])

  const translate = useCallback((key: TranslationKey) => {
    return t(key, locale)
  }, [locale])

  return createElement(
    LocaleContext.Provider,
    { value: { locale, setLocale, t: translate } },
    children
  )
}

// ── Hook ──
export function useLocale() {
  return useContext(LocaleContext)
}

