# Mina’s non-technical traveler review

**Review date:** 2026-07-23
**Persona:** Mina, 29, Korean marketing professional and ordinary traveler
**Grade:** **C+**

## 1. Overall impression

처음 화면은 꽤 좋다. 샘플 영상이 먼저 보여서 “아, 내 이동 경로를 이런 영상으로 만드는구나”가 바로 이해되고, 파일이 없으면 직접 경로를 그릴 수도 있다. 한국어도 자동으로 잡혔고, GPX를 넣은 뒤 재생하고 카메라 장면을 추가하고 릴스용 세로 영상을 고르는 흐름까지는 생각보다 막히지 않았다.

그런데 여행 앱의 제일 중요한 순간에서 힘이 빠진다. 서울에서 일본까지 간 경로를 불러왔는데 지도에 도시, 바다, 국경, 도로가 하나도 없다. 색 바탕 위에 선만 보이니 “이게 내 여행 영상”이라는 감정이 생기지 않는다. 기능은 돌아가지만 결과물이 아직 공유하고 싶은 여행 이야기로 보이지 않는다. 모바일 내보내기는 화면에 드러나지 않는 고해상도 캔버스 때문에 메모리 안전장치도 믿기 어렵다. 그래서 현재 평가는 C+다.

## 2. What I actually tested

실행 중인 앱을 Chromium으로 직접 사용했다.

- 데스크톱: 1440×900, DPR 1, 브라우저 언어 `ko-KR`
- 모바일: 390×844, DPR 2
- 한국어 첫 화면 확인 → 영어로 전환 → `korea-japan.gpx` 업로드
- 37개 위치가 있는 `Korea to Japan` 경로 로드
- 재생/일시정지
- Camera 열기 → `Scene 1` 추가
- Export 열기 → 기본 `TikTok / Shorts / Reels (1080×1920)` 확인
- 모바일에서 로컬 테스트 내보내기 시작 → 진행/취소 화면 확인
- 데스크톱 첫 화면, 로드된 경로, Camera, Export와 모바일 경로/내보내기 화면을 캡처해 육안 검토

별도의 전체 E2E는 111개 중 110개 통과, 실제 WebCodecs MP4 테스트 1개는 환경변수 게이트 때문에 스킵, 실패 0개였다.

### Walkthrough harness note

완료된 결과를 얻기 전 두 종류의 짧은 자동화 실패도 있었다. 첫 시도들은 랜딩 지도 캔버스를 `visible`로 기다리거나 트랙 제목을 단일 텍스트로 찾는 잘못된 로케이터 때문에 타임아웃/strict-mode 종료가 났다. 다음 시도들은 Next 개발 오버레이가 일반 클릭을 가로채거나 모달 뒤 제목을 접근성 트리에서 찾으려다 종료됐다. 앱 기능 실패로 분류하지 않았고, 각 시도는 `finally`에서 브라우저를 닫은 뒤 더 정확한 attached/test-id/forced-click 조건으로 계속 진행해 최종 walkthrough를 완료했다. 전체 110-pass E2E 결과는 이와 별개다.

프로세스 정리도 확인했다. 전체 E2E가 소유한 그룹 `55207`, `55937`, `59805`와 walkthrough 서버 그룹 `14838`, 모든 짧은 runner PID가 종료됐고, 포트 `31997`/`32197`은 비어 있다. 기존의 관련 없는 브라우저 프로세스는 건드리지 않았다.

## 3. Flow walkthrough

### Landing

첫 화면은 이번 앱에서 가장 잘된 부분이다. 중앙 카드, 큰 **파일 선택**, **지도에 경로 그리기**, **파일을 찾는 데 도움이 필요하세요?**가 한 화면에 있다. 샘플 미리보기는 단순 장식이 아니라 클릭 가능한 데모라서, 파일 형식을 모르는 사람도 먼저 결과를 볼 수 있다.

한국어는 자동 감지됐다. 실제 확인값도 `<html lang="ko">`, 선택값 `KO`였다. “여행을 영상으로 만들어보세요”, “파일을 찾는 데 도움이 필요하세요?”는 자연스럽다.

다만 한국어 첫 화면은 “Google 지도, Strava, Garmin, AllTrails 등”이라고만 말한다. 영어는 `.json`, `.gpx`, `.kml`을 바로 보여주는데 한국어는 확장자가 빠진다. 나는 Garmin에서 받은 FIT 파일도 되는 줄 알고 고를 수 있다. 가이드 안쪽까지 들어가기 전에 지원 형식을 보여줘야 한다.

> “샘플이 먼저 보여서 설명서를 안 읽어도 대충 알겠어요. 이건 좋다.”

### Upload and errors

GPX 업로드는 빠르고, 파일명 대신 트랙 안의 `Korea to Japan` 이름과 `37 / 37 locations`가 바로 보였다. 전체 E2E에서는 GPX, KML, 여러 Google JSON 변형이 모두 로드됐고, 잘못된 `.txt`, 엔티티가 들어간 XML, 이상한 고도/세그먼트 같은 오류 경로도 앱을 깨뜨리지 않았다.

오류 뒤에 다시 시도할 수 있는 안내가 붙고, Google/Strava/Garmin/AllTrails별 내보내기 가이드가 있는 것도 좋다. 다만 “어느 앱 파일이든 된다”가 아니라 “그 앱에서 **GPX/KML/지원 JSON으로 내보낸 파일**이 된다”는 문장을 첫 화면에 더 정확히 써야 한다.

### Route preview and playback

재생 버튼, 속도, 길이, 카메라 추적, 범위 핸들, 고도 그래프는 데스크톱과 모바일 모두 실제로 조작할 수 있었다. 모바일 버튼은 크고, 상단의 New/Camera/Export도 손가락으로 누르기 쉽다. 390px 화면에서 제목, 타임라인, 재생 카드가 겹치지 않았다.

하지만 미리보기의 배경은 지도라고 부르기 어렵다. 다섯 스타일 JSON 모두 `sources: {}`이고 배경 레이어 하나뿐이며, 앱이 얹는 것은 좌표 격자다. 실제 모바일 캡처에서 서울→일본 선은 보였지만 서울, 부산, 바다, 일본이라는 단서는 하나도 없었다.

> “서울에서 일본까지 갔는데 도시 이름 하나 안 보이면, 이게 내 여행인지 선 긋기 연습인지 모르겠어요.”

이건 꾸밈 문제가 아니다. 경로가 맞는지 확인하기 어렵고, 완성 영상의 공유 가치도 떨어뜨리는 핵심 문제다.

### Camera and scenes

Camera 패널은 `+ Add`로 장면을 하나 추가하는 흐름이 이해됐다. 장면 이름이 `Scene 1`로 바로 생기고, 카메라 모드와 구간을 조정할 수 있다. 고급 편집을 별도 패널로 숨겨 기본 재생 화면을 복잡하게 만들지 않은 점도 좋다.

문제는 이름이다. 영어의 **Street View**는 Google 거리 사진처럼 실제 거리 영상을 기대하게 한다. 실제 기능은 확대/피치가 낮은 경로 추적일 뿐이고, 배경에는 거리조차 없다. 한국어 “거리 시점 / 거리 수준에서 따라가기”도 번역투이고 같은 오해를 만든다. **Low-angle follow / 지면 가까이 따라가기** 정도가 솔직하다.

### Export

내보내기 다이얼로그는 기본값이 세로 `1080×1920`이라 좋다. 마케팅 일을 하는 내 입장에서는 해상도 표를 공부하지 않고 바로 릴스/쇼츠용을 고를 수 있다. Quality만 먼저 보여주고 Codec/FPS는 Advanced에 숨긴 것도 비전문가에게 맞다.

전체 E2E에서 로컬 테스트 내보내기는 성공 화면, 다운로드 링크, 취소, 저장 선택기 취소, 대체 다운로드, 공유 실패까지 통과했다. 모바일 직접 실행에서도 진행률과 Cancel이 분명했다.

다만 두 가지가 걱정된다.

첫째, 모바일 DPR 2에서 `1080×1920`을 고르자 실제 MapLibre 캔버스는 **2160×3840**이 됐다. 화면상 설정은 1080×1920인데 내부 작업량은 픽셀 기준 4배다. 현재 메모리 계산은 1080×1920만 센다. 저사양 폰에서 오래 기다린 뒤 탭이 죽을 수 있다.

둘째, 일반 E2E의 성공 영상은 26바이트 테스트 스텁이다. 진짜 mediabunny/WebCodecs MP4를 만들고 `ftyp`과 파일 크기를 검사하는 테스트는 `TRAVELBACK_REAL_EXPORT=1`일 때만 실행되며 이번 전체 실행에서는 스킵됐다. 따라서 “최종 MP4 저장까지 모든 브라우저에서 확인했다”고 말하면 안 된다.

> “릴스 크기가 기본인 건 편해요. 그런데 폰에서 안 보이는 작업량이 네 배라면, 내보내기 버튼 누르기 전에 앱이 먼저 말려줘야죠.”

### Post-export and sharing

완료 화면에 비디오 미리보기, Download MP4, 지원되는 기기의 Share가 함께 있는 구성은 좋다. 저장 선택기를 취소했을 때 **Video ready, not saved yet**로 구분하고, 단순 다운로드 시작을 **saved**라고 과장하지 않는 문구도 신뢰를 준다.

반대로 **Export Again**을 누르면 설정 화면으로 돌아오는 게 아니라 패널이 닫힌다. 다시 Export를 찾아 눌러야 한다. 버튼 이름과 행동이 다르다. 내보낸 직후는 사용자가 가장 집중하는 순간이라 사소하게 느껴지지 않는다.

### Starting over

로드된 경로의 **New**는 현재 경로, 트림, 장면, 내보낸 결과를 먼저 지우고 새 경로 만들기를 연다. 거기서 Cancel을 눌러도 이전 작업은 돌아오지 않는다. 저장 기능이 없는 앱에서 확인창이나 복구가 없는 것은 불안하다.

> “새 경로를 눌렀다가 마음이 바뀌었는데 전 여행이 사라지면, 두 번 다시 실험적으로 버튼을 못 눌러요.”

### Light/dark mode and language

시스템 모드와 수동 테마 전환은 E2E에서 통과했고, 밝은 화면의 대비와 카드 경계는 데스크톱/모바일 모두 읽을 만했다. EN/KO/JA/ZH/ES 선택도 작지만 44px 높이를 확보했다.

한국어 첫 화면에서는 영어 문장이 새지 않았다. Travelback, Strava, Garmin, AllTrails 같은 고유명사는 문제없다. 고급 화면의 “코덱”, “FPS”, “프리셋”은 일반인에게 어렵지만 기본적으로 접혀 있어서 우선순위는 낮다. 더 거슬리는 것은 앞서 말한 “거리 수준에서 따라가기” 같은 직역체다.

## 4. Issue table

| Severity | Location | What I see/feel | Recommendation |
|---|---|---|---|
| 🔴 Critical | Route preview and exported map; `public/map-styles/*.json:4,16-28`, `MapView.tsx:291-320` | My trip is a line on a blank colored field. I cannot confirm places or feel the journey. | Bundle a small offline coastline/country/city-label layer, or offer a clearly named **Private grid** mode alongside an explicit map choice. Keep it client-only; no account/backend is needed. |
| 🟡 Medium | Mobile export; `MapView.tsx:530-539,892-903`, `videoEncoder.ts:117-132` | A 1080×1920 job secretly creates a 2160×3840 source canvas at DPR 2, but the safety check still counts 1080×1920. | Force map pixel ratio 1 during export and restore it afterward, or gate from actual canvas dimensions with GPU/staging overhead. |
| 🟡 Medium | New route; `TrackToolbar.tsx:143-152`, `page.tsx:324-360,462-464` | New clears my current unsaved work before I create anything; Cancel does not undo it. | Keep the old session until the replacement is committed, or confirm discard and provide undo. |
| 🟡 Medium | Korean landing; `i18n.ts:19-20,389-390` | English tells me `.json/.gpx/.kml`; Korean only lists app brands, so I may choose FIT/TCX/CSV. | Put the three supported extensions in every locale’s first-screen copy and say other apps must export one of them. |
| 🟡 Medium | Camera preset names; `i18n.ts:223,229,593,599`, `camera.ts:430` | “Street View / 거리 시점” sounds like street imagery, but it is only a low-angle follow on an abstract background. | Rename it **Ground-level follow / 지면 가까이 따라가기** and describe the actual camera motion. |
| 🟡 Medium | Export completion; `ExportPanel.tsx:347-366`, `page.tsx:482-485` | Export Again closes the dialog instead of reopening settings. “이게 왜 닫히지?” | Reset the result and keep the idle export form open; otherwise rename the action Close. |
| 🟢 Low | Release confidence; `e2e/travelback.spec.ts:2955-3017` | UI success is well tested, but the ordinary suite does not prove a real MP4. | Run the existing real-export test on a WebCodecs-capable browser in a scheduled/device matrix and retain a small validated artifact. |
| 🟢 Low | Locale detection; `i18n.ts:1883-1891` | `ko` and `ko-KR` work, but another Korean regional tag falls back to English. | Detect `ko-*` consistently, as the code already does for `ja`, `zh`, and `es`. |

## 5. What works well

- The sample preview teaches the product before asking me to find a file.
- Five clear import-guide tabs cover phone Google export, legacy Takeout, Strava, Garmin, and AllTrails.
- GPX/KML/Google JSON stay local; no login or upload anxiety.
- File/parser errors recover without crashing the page.
- Timeline handles, playback, elevation, Camera, and Export remain usable at 390px.
- Social presets use familiar platform names and default to the format I am most likely to want.
- Advanced codec/FPS options are hidden from beginners.
- Export completion language distinguishes **saved**, **download started**, and **ready but not saved** instead of pretending.
- Keyboard focus, modal semantics, Escape behavior, touch targets, light/dark mode, and five locales have unusually broad automated coverage.

## 6. E2E results

### Full suite

| Result | Count |
|---|---:|
| Passed | 110 |
| Failed | 0 |
| Skipped | 1 |
| Duration | 13.1 minutes |

The skipped test was the explicit real-WebCodecs MP4 test. It is gated by `TRAVELBACK_REAL_EXPORT=1`; the ordinary suite still exercises export UI with a localhost-only stub.

### Format × flow coverage

| Input | Upload/map | Playback | Camera/scenes | Export panel/state | Real final MP4 |
|---|---|---|---|---|---|
| GPX, including segmented/antimeridian/XML edge fixtures | Pass | Pass | Pass | Pass, including success/cancel/download/share states | **Skipped** in ordinary run |
| KML `gx:Track` / point placemarks | Pass | Pass in full-journey KML test | Pass in full-journey KML test | Pass to ready-to-start panel | Not run per format |
| Google flat JSON | Pass | Core playback covered elsewhere | Not run as a full per-format journey | Import only for this variant | Not run |
| Google Records.json | Pass | Pass in full-journey test | Export path reached; no scene added in that test | Pass to ready-to-start panel | Not run |
| Semantic Location History | Pass | Import only for this variant | Import only | Import only | Not run |
| Timeline Edits | Pass | Import only for this variant | Import only | Import only | Not run |
| Semantic Segments / revisit variants | Pass, including repeat/dedup regressions | Import only for this variant | Import only | Import only | Not run |
| Manual journey creation | Pass across add/undo/search/mobile/retry cases | Covered after created route | Core editor covered | Core export covered separately | Not run |
| Unsupported `.txt` / hostile XML | Expected rejection pass | N/A | N/A | N/A | N/A |

No automated failure needs a bug report. The important gap is **coverage**, not a claimed application failure: only KML and Records have named “full journey” tests, and none of the per-format runs proves a real MP4.

## 7. Competitive comparison

| Product | Mina’s view |
|---|---|
| Travelback | Best privacy story: no account, local parsing, many import shapes, direct MP4-oriented editor. It loses the actual sense of place because its “map” has no geography. |
| Relive | Relive’s official description centers on sharing outdoor activities as 3D video stories, and its download flow saves the 3D video to the device ([Relive overview](https://support.relive.com/kb/guide/en/what-is-relive-7yekWw27Eo/Steps/3654418), [download guide](https://support.relive.com/kb/guide/en/how-to-download-a-video-jwEsUb2aPJ/Steps/3654430)). That is much closer to the emotional result I expect. Travelback gives me more file/privacy control, but the visual finish is behind. |
| Strava | Strava’s activity maps include roads, places, parks, POIs, and trails, and activity sharing can include a map or photo with stats ([map details](https://support.strava.com/en-us/articles/15402176-about-strava-maps), [sharing](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities)). It is account/network-heavy and sport-first, while Travelback is a simpler private video tool. Still, Strava makes it immediately obvious where the route happened. |
| Polarsteps | Polarsteps automatically records a route, attaches photos/videos/stories, shares the trip, and offers a Travel Reel/Book ([official product page](https://www.polarsteps.com/)). That is a fuller travel diary than Travelback’s route-only output, but it requires an ongoing service workflow. Travelback can win for a quick private one-off video if it adds place context and reliable export. |

## 8. Priority recommendations

1. **Put geography back into the story.** Ship a lightweight offline coastline/country/city-label layer or clearly separate “Private grid” from a real map option.
2. **Make mobile export deterministic.** Force DPR 1 for the map during export, calculate actual memory, and test DPR 2/3 cleanup.
3. **Stop accidental session loss.** Preserve the old journey until New is confirmed; Cancel must return to it.
4. **Tell Korean users the exact file types on the first screen.** `.json`, `.gpx`, `.kml` should be impossible to miss.
5. **Make labels and tests tell the truth.** Rename Street View, keep Export Again open, and run the existing real-MP4 test on a supported browser/device schedule.

## Bottom line

I can get from file to an export screen without technical help, and that is a real achievement. But I would not post the result yet. 여행 영상인데 장소가 안 보이면 여행 이야기가 아니다. Fix the geographic context and mobile export safety first; the rest of the product is already much closer to usable than the C+ grade makes it sound.
