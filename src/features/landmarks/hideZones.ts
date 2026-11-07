import type { HideZone } from './landmarks.ts'

/**
 * Where the map's own buildings make way for the landmarks, as
 * `hideZones(LANDMARKS)` works them out, written out here so the map's
 * style needs none of the landmarks' geometry, which loads only once they
 * are drawn. landmarks.test.ts checks that it still matches the catalog;
 * when it doesn't, write it out afresh from what that test expects.
 */
export const LANDMARK_HIDE_ZONES: readonly HideZone[] = [
  // Atakule
  { center: [32.856137, 39.886135], within: 1, tallerThan: 0 },
  // Anıtkabir
  { center: [32.83691623434825, 39.92497674190314], within: 60, tallerThan: 0 },
  { center: [32.83801103954601, 39.92563462435892], within: 42, tallerThan: 0 },
  { center: [32.834528506975815, 39.92706513961925], within: 4, tallerThan: 0 },
  { center: [32.83489732754143, 39.927285968115214], within: 4, tallerThan: 0 },
  // Ankara Kalesi
  { center: [32.865641546591455, 39.94164321162192], within: 1, tallerThan: 0 },
  // AŞTİ
  { center: [32.81277878942101, 39.918203], within: 1, tallerThan: 0 },
  { center: [32.813611318310045, 39.91818861087418], within: 1, tallerThan: 0 },
  { center: [32.81168829383397, 39.918203], within: 1, tallerThan: 0 },
  // Atlantis AVM
  { center: [32.7148, 39.97071945629098], within: 1, tallerThan: 0 },
  { center: [32.715269385582374, 39.96910067963628], within: 1, tallerThan: 0 },
  { center: [32.715562751571355, 39.96973020389088], within: 1, tallerThan: 0 },
  { center: [32.71447025662838, 39.96876073653878], within: 1, tallerThan: 0 },
  { center: [32.714121737833466, 39.97009038169655], within: 1, tallerThan: 0 },
  { center: [32.71407157224935, 39.97028238659421], within: 1, tallerThan: 0 },
  { center: [32.71396801405524, 39.97063289670597], within: 1, tallerThan: 0 },
  { center: [32.71388469811437, 39.9708453611419], within: 1, tallerThan: 0 },
  // Atlantis City
  { center: [32.71356561370702, 39.97196861227619], within: 1, tallerThan: 0 },
  { center: [32.71338646487641, 39.97150328893133], within: 1, tallerThan: 0 },
  { center: [32.71327351897065, 39.97104575969628], within: 1, tallerThan: 0 },
  { center: [32.71323753274267, 39.970578637710695], within: 1, tallerThan: 0 },
  { center: [32.713236457067374, 39.97011915994819], within: 1, tallerThan: 0 },
  { center: [32.71334940297314, 39.96930392603848], within: 1, tallerThan: 0 },
  { center: [32.71351965303541, 39.96889705851726], within: 1, tallerThan: 0 },
  { center: [32.713698801866016, 39.96849641129521], within: 1, tallerThan: 0 },
  // TBMM
  { center: [32.851065, 39.911734], within: 1, tallerThan: 0 },
  // Galata Kulesi
  { center: [28.974213, 41.025634], within: 1, tallerThan: 30 },
  // Kız Kulesi
  { center: [29.00409, 41.02111395922182], within: 18, tallerThan: 0 },
  // Çamlıca Kulesi
  { center: [29.065541, 41.016372], within: 1, tallerThan: 0 },
  // Sabancı Center
  {
    center: [29.01047790406721, 41.08470439165743],
    within: 12,
    tallerThan: 50,
  },
  {
    center: [29.010093709631956, 41.08521160834257],
    within: 12,
    tallerThan: 50,
  },
  // İstanbul Sapphire
  { center: [29.006984, 41.084966], within: 1, tallerThan: 0 },
  // Ali Sami Yen Spor Kompleksi RAMS Park
  { center: [28.991181, 41.103248], within: 80, tallerThan: 0 },
  // Beyazıt Kulesi
  { center: [28.964896, 41.012786], within: 1, tallerThan: 0 },
  // Dolmabahçe Saat Kulesi
  { center: [28.996363, 41.037658], within: 1, tallerThan: 0 },
  // Rumeli Hisarı
  { center: [29.05670102545338, 41.08455417670543], within: 1, tallerThan: 0 },
  // Ayasofya
  { center: [28.980049, 41.008526], within: 44, tallerThan: 20 },
  { center: [28.980049, 41.008526], within: 1, tallerThan: 0 },
  { center: [28.97977270838238, 41.0090863379613], within: 5, tallerThan: 0 },
  { center: [28.979303178307177, 41.00853899098928], within: 5, tallerThan: 0 },
  { center: [28.980267268891744, 41.00806411867588], within: 5, tallerThan: 0 },
  { center: [28.980832179496005, 41.00856543553176], within: 5, tallerThan: 0 },
  // Sultanahmet Camii
  { center: [28.976879, 41.005253], within: 1, tallerThan: 0 },
  { center: [28.976879, 41.005253], within: 42, tallerThan: 20 },
  {
    center: [28.976403561796033, 41.00559347820806],
    within: 41,
    tallerThan: 0,
  },
  // Ortaköy Camii
  { center: [29.026895, 41.047223], within: 1, tallerThan: 0 },
  // Haydarpaşa Garı
  { center: [29.01863, 40.99611], within: 1, tallerThan: 0 },
  // Konak Saat Kulesi
  { center: [27.128718, 38.418885], within: 3, tallerThan: 0 },
  // Selimiye Camii
  { center: [26.55936, 41.67795], within: 1, tallerThan: 0 },
  // Bursa Ulu Camii
  { center: [29.061882, 40.183923], within: 1, tallerThan: 0 },
  // Mevlana Müzesi
  {
    center: [32.50482311275964, 37.8706340543709],
    within: 30,
    tallerThan: 0,
  },
  // Hadrian Kapısı
  { center: [30.708548, 36.885265], within: 1, tallerThan: 0 },
  {
    center: [30.708427977824126, 36.88534332555491],
    within: 1,
    tallerThan: 0,
  },
  {
    center: [30.708631026679807, 36.88516040282111],
    within: 1,
    tallerThan: 0,
  },
]
