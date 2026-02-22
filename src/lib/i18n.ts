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
    'fileUpload.dropHint': 'Drop your travel file here — from Google Maps, Strava, Garmin, AllTrails, or any GPS app',
    'fileUpload.formatHint': 'Works with files from Google Maps, Strava, Garmin, and most GPS apps',
    'fileUpload.browseAria': 'Browse files to upload',
    'fileUpload.parsing': 'Parsing...',
    'fileUpload.browse': 'Browse Files',
    'fileUpload.trySample': 'Try with a sample trip',
    'fileUpload.importGuideLink': 'Need help finding your file?',
    'fileUpload.parseFailed': 'Failed to parse file',
    'fileUpload.fileTooLarge': 'File is too large (max 500 MB)',
    'fileUpload.drawRoute': 'Draw a route on the map',
    'fileUpload.whereToFind': 'Where do I find my travel file?',
    'fileUpload.fromGoogle': 'Google Maps',
    'fileUpload.fromOtherApps': 'Strava, Garmin, AllTrails, and more',

    // Controls
    'controls.pause': 'Pause',
    'controls.play': 'Play',
    'controls.pauseKey': 'Pause (Space)',
    'controls.playKey': 'Play (Space)',
    'controls.speedLabel': 'Speed',
    'controls.playbackSpeed': 'Playback speed',
    'controls.animationDuration': 'Animation duration',
    'controls.cameraFollowOff': 'Enable camera tracking',
    'controls.cameraFollowOn': 'Disable camera tracking',
    'controls.cameraFollowOnTitle': 'Camera tracking: ON (F)',
    'controls.cameraFollowOffTitle': 'Camera tracking: OFF (F)',
    'controls.follow': 'Track',
    'controls.trackOn': 'Track: ON',
    'controls.trackOff': 'Track: OFF',

    // SceneEditor
    'scenes.title': 'Camera',
    'scenes.add': '+ Add',
    'scenes.presets': 'Presets:',
    'scenes.cinematic': 'Cinematic',
    'scenes.simple': 'Simple',
    'scenes.birdsEye': "Bird's Eye",
    'scenes.dynamic': 'Dynamic',
    'scenes.blend': 'Transition',
    'scenes.blendAria': 'Scene transition blend duration',
    'scenes.startPct': 'Route Start %',
    'scenes.endPct': 'Route End %',
    'scenes.zoom': 'Zoom',
    'scenes.pitch': 'Tilt',
    'scenes.bearing': 'Direction',
    'scenes.rotation': 'Orbit Speed',
    'scenes.emptyState': 'No scenes yet. Click "+ Add" to create one,\nor scenes will be auto-generated on export.',
    'scenes.deleted': 'Deleted',
    'scenes.undo': 'Undo',
    'scenes.customize': 'Customize',
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
    'export.estimatedTime': 'Estimated time:',
    'export.seconds': '~{n} seconds',
    'export.minutes': '~{n} minutes',
    'export.startExport': 'Start Export',
    'export.advanced': 'Advanced',
    'export.quality': 'Quality',
    'export.qualityLow': 'Low',
    'export.qualityMedium': 'Medium',
    'export.qualityHigh': 'High',
    'export.qualityMaximum': 'Maximum',
    'export.success': 'Video saved!',
    'export.savedToDownloads': 'Your video is in your Downloads folder.',
    'export.tipTikTok': 'Upload to TikTok: Open TikTok → tap + → Upload → select from gallery',
    'export.tipInstagram': 'Upload to Instagram: Open Instagram → tap + → Reel/Post → select from gallery',
    'export.tipYouTube': 'Upload to YouTube: Open YouTube → tap + → Upload video → select file',
    'export.exportAgain': 'Export Again',
    'export.share': 'Share',

    // GoogleGuide / ImportGuide
    'google.title': 'How to Get Your Travel Data',
    'google.close': 'Close',
    'google.phoneTab': 'Google Maps (Phone)',
    'google.takeoutTab': 'Google Maps (Computer)',
    'google.stravaTab': 'Strava',
    'google.garminTab': 'Garmin',
    'google.allTrailsTab': 'AllTrails',
    'google.komootTab': 'Komoot',
    'google.otherTab': 'Other Apps',
    'google.step1Phone': 'Open Google Maps',
    'google.step1PhoneItem1': 'Tap your profile picture',
    'google.step1PhoneItem2': 'Go to "Your Timeline"',
    'google.step2Phone': 'Export your data',
    'google.step2PhoneItem1': 'Tap ⋮ (more) → Settings → Export Timeline data',
    'google.step2PhoneItem2': 'This saves a file to your Downloads folder — you\'ll upload it in the next step',
    'google.step3Phone': 'Upload to Travelback',
    'google.step3PhoneItem1': 'Drop the JSON file here',
    'google.step3PhoneItem2': 'Use the timeline slider to select a date range',
    'google.step1Takeout': 'Go to Google Takeout',
    'google.step1TakeoutItem1': 'Visit takeout.google.com',
    'google.step1TakeoutItem2': 'Deselect all, then select "Location History"',
    'google.openTakeout': 'Open Google Takeout',
    'google.step2Takeout': 'Download & extract',
    'google.step2TakeoutItem1': 'Create export → wait for email (usually 10 minutes to a few hours) → download zip',
    'google.step2TakeoutItem2': 'Look for a file called Records.json (this is your location history). Timeline Edits.json or monthly files (e.g. 2024_JANUARY.json) also work.',
    'google.step3Takeout': 'Upload to Travelback',
    'google.step3TakeoutItem1': 'Drop any of the JSON files here',
    'google.step3TakeoutItem2': 'Use the timeline slider to select a date range',
    'google.strava1': 'Export from Strava',
    'google.strava1Item1': 'Go to strava.com → Your Profile → Settings',
    'google.strava1Item2': 'Under "My Account", click "Download or Delete Your Account"',
    'google.strava2': 'Download activities',
    'google.strava2Item1': 'Click "Request Your Archive"',
    'google.strava2Item2': 'Wait for email → download zip → find GPX files in the activities folder',
    'google.garmin1': 'Export from Garmin Connect',
    'google.garmin1Item1': 'Go to connect.garmin.com → Activities',
    'google.garmin1Item2': 'Open an activity → click ⚙ → Export to GPX',
    'google.alltrails1': 'Export from AllTrails',
    'google.alltrails1Item1': 'Open a trail on alltrails.com',
    'google.alltrails1Item2': 'Click ⋯ → Export GPX',
    'google.komoot1': 'Export from Komoot',
    'google.komoot1Item1': 'Open a tour on komoot.com',
    'google.komoot1Item2': 'Click ⋯ → Download as GPX',
    'google.other1': 'Other GPS apps',
    'google.other1Item1': 'Most GPS and fitness apps can export GPX files',
    'google.other1Item2': 'Look for "Export", "Share as GPX", or "Download GPX" in your app\'s settings',
    'google.tips': 'Tips',
    'google.tip1': 'Since 2024, Google stores Timeline data on-device — phone export usually has the most complete data',
    'google.tip2': 'Large files (100MB+) may take a moment to parse',
    'google.tip3': 'Use the timeline selector to zoom into specific trips',

    // Camera mode labels
    'camera.overview': 'Overview',
    'camera.flyover': 'Flyover',
    'camera.orbit': 'Spin Around',
    'camera.ground': 'Street View',
    'camera.closeup': 'Closeup',
    'camera.birdeye': "Bird's Eye",
    'camera.overviewDesc': 'Wide view of the full route',
    'camera.flyoverDesc': 'Follow the route from above',
    'camera.orbitDesc': 'Spin around a spot on the route',
    'camera.groundDesc': 'Follow from street level',
    'camera.closeupDesc': 'Tight zoom on the route',
    'camera.birdeyeDesc': 'High-altitude tilted view',

    // Codec descriptions
    'codec.h264Desc': 'H.264 — Best compatibility',
    'codec.h265Desc': 'H.265 — Better quality',
    'codec.av1Desc': 'AV1 — Smallest file',

    // ElevationProfile
    'elevation.label': 'Elevation',
    'elevation.profileAria': 'Elevation profile',

    // TimelineSelector
    'timeline.points': 'locations',

    // JourneyCreator
    'journey.title': 'Create Journey',
    'journey.cancel': 'Cancel',
    'journey.hint': 'Click on the map to add locations. Click a location to delete it. Drag to reposition.',
    'journey.noPoints': 'No locations yet',
    'journey.onePoint': '1 location',
    'journey.undo': 'Undo',
    'journey.clear': 'Clear',
    'journey.done': 'Done',
    'journey.defaultName': 'Custom Journey',
    'journey.subtitle': 'Plan a new route or recreate one from memory',
    'journey.instructionTitle': 'Click on the map to trace your route',
    'journey.instructionSubtitle': 'Best for planning new trips — to relive a past trip, upload your GPS file instead',

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
    'app.new': 'New Route',
    'app.openSceneEditor': 'Open camera editor',
    'app.scenes': 'Camera',
    'app.mapStylePrefix': 'Map:',
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
    'fileUpload.dropHint': '여행 파일을 여기에 놓으세요 — Google 지도, Strava, Garmin, AllTrails 등',
    'fileUpload.formatHint': 'Google Maps, Strava, Garmin 등 대부분의 GPS 앱 파일을 지원합니다',
    'fileUpload.browseAria': '업로드할 파일 선택',
    'fileUpload.parsing': '분석 중...',
    'fileUpload.browse': '파일 선택',
    'fileUpload.trySample': '샘플 여행으로 체험하기',
    'fileUpload.importGuideLink': '파일을 찾는 데 도움이 필요하세요?',
    'fileUpload.parseFailed': '파일을 분석할 수 없습니다',
    'fileUpload.fileTooLarge': '파일이 너무 큽니다 (최대 500 MB)',
    'fileUpload.drawRoute': '지도에 경로 그리기',
    'fileUpload.whereToFind': '여행 파일은 어디에 있나요?',
    'fileUpload.fromGoogle': 'Google 지도',
    'fileUpload.fromOtherApps': 'Strava, Garmin, AllTrails 등',

    // Controls
    'controls.pause': '일시정지',
    'controls.play': '재생',
    'controls.pauseKey': '일시정지 (Space)',
    'controls.playKey': '재생 (Space)',
    'controls.speedLabel': '속도',
    'controls.playbackSpeed': '재생 속도',
    'controls.animationDuration': '애니메이션 길이',
    'controls.cameraFollowOff': '카메라 추적 켜기',
    'controls.cameraFollowOn': '카메라 추적 끄기',
    'controls.cameraFollowOnTitle': '카메라 추적: 켜짐 (F)',
    'controls.cameraFollowOffTitle': '카메라 추적: 꺼짐 (F)',
    'controls.follow': '추적',
    'controls.trackOn': '추적: 켜짐',
    'controls.trackOff': '추적: 꺼짐',

    // SceneEditor
    'scenes.title': '카메라',
    'scenes.add': '+ 추가',
    'scenes.presets': '프리셋:',
    'scenes.cinematic': '시네마틱',
    'scenes.simple': '심플',
    'scenes.birdsEye': '조감도',
    'scenes.dynamic': '다이나믹',
    'scenes.blend': '전환',
    'scenes.blendAria': '장면 전환 블렌드 길이',
    'scenes.startPct': '경로 시작 %',
    'scenes.endPct': '경로 끝 %',
    'scenes.zoom': '줌',
    'scenes.pitch': '기울기',
    'scenes.bearing': '방향',
    'scenes.rotation': '회전 속도',
    'scenes.emptyState': '장면이 없습니다. "+ 추가"를 눌러 생성하거나,\n내보내기 시 자동으로 생성됩니다.',
    'scenes.deleted': '삭제됨',
    'scenes.undo': '되돌리기',
    'scenes.customize': '설정',
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
    'export.estimatedTime': '예상 소요 시간:',
    'export.seconds': '~{n}초',
    'export.minutes': '~{n}분',
    'export.startExport': '내보내기 시작',
    'export.advanced': '고급 설정',
    'export.quality': '화질',
    'export.qualityLow': '낮음',
    'export.qualityMedium': '보통',
    'export.qualityHigh': '높음',
    'export.qualityMaximum': '최대',
    'export.success': '영상이 저장되었습니다!',
    'export.savedToDownloads': '다운로드 폴더에 저장되었습니다.',
    'export.tipTikTok': 'TikTok 업로드: TikTok 열기 → + 탭 → 업로드 → 갤러리에서 선택',
    'export.tipInstagram': 'Instagram 업로드: Instagram 열기 → + 탭 → 릴스/게시물 → 갤러리에서 선택',
    'export.tipYouTube': 'YouTube 업로드: YouTube 열기 → + 탭 → 동영상 업로드 → 파일 선택',
    'export.exportAgain': '다시 내보내기',
    'export.share': '공유',

    // GoogleGuide / ImportGuide
    'google.title': '여행 데이터 가져오기',
    'google.close': '닫기',
    'google.phoneTab': 'Google 지도 (휴대폰)',
    'google.takeoutTab': 'Google 지도 (컴퓨터)',
    'google.stravaTab': 'Strava',
    'google.garminTab': 'Garmin',
    'google.allTrailsTab': 'AllTrails',
    'google.komootTab': 'Komoot',
    'google.otherTab': '기타 앱',
    'google.step1Phone': 'Google 지도 열기',
    'google.step1PhoneItem1': '프로필 사진을 탭하세요',
    'google.step1PhoneItem2': '"내 타임라인"으로 이동하세요',
    'google.step2Phone': '데이터 내보내기',
    'google.step2PhoneItem1': '⋮ (더보기) → 설정 → 타임라인 데이터 내보내기를 탭하세요',
    'google.step2PhoneItem2': '다운로드 폴더에 파일이 저장됩니다 — 다음 단계에서 업로드하세요',
    'google.step3Phone': 'Travelback에 업로드',
    'google.step3PhoneItem1': 'JSON 파일을 여기에 놓으세요',
    'google.step3PhoneItem2': '타임라인 슬라이더로 날짜 범위를 선택하세요',
    'google.step1Takeout': 'Google Takeout으로 이동',
    'google.step1TakeoutItem1': 'takeout.google.com에 접속하세요',
    'google.step1TakeoutItem2': '모두 선택 해제 후 "위치 기록"을 선택하세요',
    'google.openTakeout': 'Google Takeout 열기',
    'google.step2Takeout': '다운로드 및 압축 해제',
    'google.step2TakeoutItem1': '내보내기 생성 → 이메일 대기 (보통 10분~수 시간) → zip 다운로드',
    'google.step2TakeoutItem2': 'Records.json이라는 파일을 찾으세요 (위치 기록 파일입니다). Timeline Edits.json이나 월별 파일 (예: 2024_JANUARY.json)도 사용 가능합니다.',
    'google.step3Takeout': 'Travelback에 업로드',
    'google.step3TakeoutItem1': 'JSON 파일을 여기에 놓으세요',
    'google.step3TakeoutItem2': '타임라인 슬라이더로 날짜 범위를 선택하세요',
    'google.strava1': 'Strava에서 내보내기',
    'google.strava1Item1': 'strava.com → 프로필 → 설정으로 이동하세요',
    'google.strava1Item2': '"내 계정"에서 "계정 다운로드 또는 삭제"를 클릭하세요',
    'google.strava2': '활동 다운로드',
    'google.strava2Item1': '"아카이브 요청"을 클릭하세요',
    'google.strava2Item2': '이메일 대기 → zip 다운로드 → activities 폴더에서 GPX 파일 찾기',
    'google.garmin1': 'Garmin Connect에서 내보내기',
    'google.garmin1Item1': 'connect.garmin.com → 활동으로 이동하세요',
    'google.garmin1Item2': '활동 열기 → ⚙ → GPX로 내보내기',
    'google.alltrails1': 'AllTrails에서 내보내기',
    'google.alltrails1Item1': 'alltrails.com에서 코스를 열어주세요',
    'google.alltrails1Item2': '⋯ → GPX 내보내기를 클릭하세요',
    'google.komoot1': 'Komoot에서 내보내기',
    'google.komoot1Item1': 'komoot.com에서 투어를 열어주세요',
    'google.komoot1Item2': '⋯ → GPX로 다운로드를 클릭하세요',
    'google.other1': '기타 GPS 앱',
    'google.other1Item1': '대부분의 GPS 및 피트니스 앱은 GPX 파일을 내보낼 수 있습니다',
    'google.other1Item2': '앱 설정에서 "내보내기", "GPX로 공유", "GPX 다운로드" 등을 찾아보세요',
    'google.tips': '팁',
    'google.tip1': '2024년부터 Google은 타임라인 데이터를 기기에 저장합니다 — 휴대폰 내보내기가 가장 완전한 데이터를 제공합니다',
    'google.tip2': '대용량 파일(100MB+)은 분석에 시간이 걸릴 수 있습니다',
    'google.tip3': '타임라인 선택기로 특정 여행을 확대하세요',

    // Camera mode labels
    'camera.overview': '전체 보기',
    'camera.flyover': '하늘에서 따라가기',
    'camera.orbit': '주위 회전',
    'camera.ground': '거리 시점',
    'camera.closeup': '클로즈업',
    'camera.birdeye': '조감도',
    'camera.overviewDesc': '전체 경로를 넓게 조망',
    'camera.flyoverDesc': '경로를 따라 위에서 비행',
    'camera.orbitDesc': '경로 위의 한 지점을 중심으로 회전',
    'camera.groundDesc': '거리 수준에서 따라가기',
    'camera.closeupDesc': '경로를 가까이 확대',
    'camera.birdeyeDesc': '높은 고도에서 기울어진 시점',

    // Codec descriptions
    'codec.h264Desc': 'H.264 — 호환성 최고',
    'codec.h265Desc': 'H.265 — 더 나은 화질',
    'codec.av1Desc': 'AV1 — 가장 작은 파일',

    // ElevationProfile
    'elevation.label': '고도',
    'elevation.profileAria': '고도 프로필',

    // TimelineSelector
    'timeline.points': '위치',

    // JourneyCreator
    'journey.title': '여행 만들기',
    'journey.cancel': '취소',
    'journey.hint': '지도를 클릭하여 위치를 추가하세요. 위치를 클릭하면 삭제됩니다. 드래그하여 위치를 변경하세요.',
    'journey.noPoints': '위치 없음',
    'journey.onePoint': '1개 위치',
    'journey.undo': '되돌리기',
    'journey.clear': '초기화',
    'journey.done': '완료',
    'journey.defaultName': '사용자 여행',
    'journey.subtitle': '새 경로를 계획하거나 기억으로 재현하세요',
    'journey.instructionTitle': '지도를 클릭하여 경로를 그려보세요',
    'journey.instructionSubtitle': '새 여행 계획에 적합합니다 — 지난 여행을 다시 보려면 GPS 파일을 업로드하세요',

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
    'app.new': '새 경로',
    'app.openSceneEditor': '카메라 편집기 열기',
    'app.scenes': '카메라',
    'app.mapStylePrefix': '지도:',
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

const LOCALE_STORAGE_KEY = 'travelback-locale'

// ── Provider component ──
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    // Check localStorage first, then detect from browser
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
      if (stored && (stored === 'en' || stored === 'ko')) {
        setLocaleState(stored)
        document.documentElement.setAttribute('lang', stored)
        return
      }
    } catch { /* localStorage not available */ }
    const detected = detectLocale()
    setLocaleState(detected)
    document.documentElement.setAttribute('lang', detected)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    document.documentElement.setAttribute('lang', l)
    try { localStorage.setItem(LOCALE_STORAGE_KEY, l) } catch { /* ignore */ }
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

