// ============================================================================
// دروب (Droob) — Official Amman Transit Data
// Sources: ammancitygis.gov.jo, ammangis.jo, Wikipedia, OpenStreetMap
// Last updated: June 2026
// ============================================================================

// ─── 1. DEPARTURE TERMINALS (12 hubs) ────────────────────────────────────────

export const DEPARTURE_TERMINALS = [
  { id: "term-south",        nameAr: "مركز انطلاق الجنوب",           nameEn: "South Terminal",             coords: [31.9200, 35.9300] as [number, number] },
  { id: "term-raghadan",     nameAr: "مركز انطلاق السياحي (رغدان)", nameEn: "Tourist Terminal (Raghadan)", coords: [31.9550, 35.9500] as [number, number] },
  { id: "term-north",        nameAr: "مركز انطلاق الشمال",           nameEn: "North Terminal (Tariq)",      coords: [31.9900, 35.9100] as [number, number] },
  { id: "term-mahatta",      nameAr: "مركز انطلاق المحطة",           nameEn: "Mahatta Terminal",            coords: [31.9650, 35.9850] as [number, number] },
  { id: "term-muhajireen",   nameAr: "مركز انطلاق المهاجرين",       nameEn: "Muhajireen Terminal",         coords: [31.9100, 35.8900] as [number, number] },
  { id: "term-midan",        nameAr: "مركز انطلاق الميدان / وادي السير", nameEn: "Midan / Wadi Al-Seer Terminal", coords: [31.9500, 35.8200] as [number, number] },
  { id: "term-sweileh",      nameAr: "مركز انطلاق صويلح",           nameEn: "Sweileh Terminal",            coords: [32.0185, 35.8500] as [number, number] },
  { id: "stop-wihdat",       nameAr: "موقف الوحدات",                nameEn: "Wihdat Stop",                 coords: [31.9240, 35.8900] as [number, number] },
  { id: "stop-nawafir",      nameAr: "موقف ساحة النوافير",          nameEn: "Nawafir Square Stop",         coords: [31.9600, 35.9200] as [number, number] },
  { id: "stop-saqf-al-seel", nameAr: "موقف سقف السيل",              nameEn: "Saqf Al-Seel Stop",           coords: [31.9520, 35.9400] as [number, number] },
  { id: "stop-king-ghazi",   nameAr: "موقف شارع الملك غازي",       nameEn: "King Ghazi St. Stop",         coords: [31.9580, 35.9150] as [number, number] },
  { id: "stop-basman",       nameAr: "موقف شارع بسمان",             nameEn: "Basman St. Stop",             coords: [31.9570, 35.9450] as [number, number] },
] as const;

// ─── 2. OPERATING COMPANIES ──────────────────────────────────────────────────

export const OPERATORS = [
  { id: "brt",      nameAr: "الباص السريع",    nameEn: "BRT" },
  { id: "mutakamila",nameAr: "المتكاملة",       nameEn: "Al-Mutakamila (Integrated)" },
  { id: "vision",   nameAr: "رؤية عمان",        nameEn: "Amman Vision" },
  { id: "royal",    nameAr: "ملكية",            nameEn: "Royal" },
  { id: "private",  nameAr: "فردية",            nameEn: "Private / Individual" },
] as const;

// ─── 3. BRT SYSTEM (7 lines, 34+ stations) ──────────────────────────────────
// Source: Wikipedia + ammangis.jo/BRT

export const BRT_LINES = [
  {
    id: "brt-99", code: "99", nameAr: "الباص السريع — صويلح ← المتحف", nameEn: "BRT Sweileh → Jordan Museum",
    opened: "2021-07-27", lengthKm: 17, stations: 26, fare: 0.50,
    color: "#E60026",
  },
  {
    id: "brt-98", code: "98", nameAr: "الباص السريع — صويلح ← المحطة (طريق طارق)", nameEn: "BRT Sweileh → Mahatta (via Tariq)",
    opened: "2022", lengthKm: 12, stations: 18, fare: 0.50,
    color: "#E60026",
  },
  {
    id: "brt-100", code: "100", nameAr: "الباص السريع — المدينة الرياضية ← المحطة", nameEn: "BRT Sports City → Mahatta",
    opened: "2021-07-27", lengthKm: 9, stations: 22, fare: 0.50,
    color: "#E60026",
  },
  {
    id: "brt-az", code: "102", nameAr: "الباص السريع — عمان ← الزرقاء", nameEn: "BRT Amman → Zarqa",
    opened: "2024-05-15", lengthKm: 20, stations: 14, fare: 1.00,
    color: "#E60026",
  },
  {
    id: "brt-103", code: "103", nameAr: "الباص السريع — الزرقاء ← المحطة", nameEn: "BRT Zarqa → Mahatta",
    opened: "2024-05-15", lengthKm: 9, stations: 24, fare: 0.75,
    color: "#E60026",
  },
  {
    id: "brt-104", code: "104", nameAr: "الباص السريع — الزرقاء ← صويلح", nameEn: "BRT Zarqa → Sweileh Direct",
    opened: "2024-12", lengthKm: 9, stations: 22, fare: 1.00,
    color: "#E60026",
  },
  {
    id: "brt-105", code: "105", nameAr: "الباص السريع — عمان ← مادبا", nameEn: "BRT Amman → Madaba",
    opened: "2025", lengthKm: 34, stations: 34, fare: 1.50,
    color: "#E60026",
  },
] as const;

// ─── 4. BRT STATIONS (Route 99: Sweileh → Jordan Museum) ────────────────────

export const BRT_ROUTE_99_STATIONS = [
  { id: "brt99-01", nameAr: "محطة صويلح",                    nameEn: "Sweileh Terminal",              coords: [32.0185, 35.8500] as [number, number], terminal: true },
  { id: "brt99-02", nameAr: "شارع هشام بن العاص",             nameEn: "Hisham ibn al-A'as Street",    coords: [32.0150, 35.8530] as [number, number] },
  { id: "brt99-03", nameAr: "شارع ياجوز",                     nameEn: "Yajouz Street",                coords: [32.0120, 35.8560] as [number, number] },
  { id: "brt99-04", nameAr: "شارع الرباني",                   nameEn: "Al-Rubani Street",             coords: [32.0100, 35.8590] as [number, number] },
  { id: "brt99-05", nameAr: "شارع أحمد الطراونة",             nameEn: "Ahmad Al-Tarawneh Street",     coords: [32.0080, 35.8620] as [number, number] },
  { id: "brt99-06", nameAr: "الجامعة الأردنية",               nameEn: "University of Jordan",          coords: [32.0050, 35.8710] as [number, number], landmark: true },
  { id: "brt99-07", nameAr: "كلية الزراعة — الجامعة الأردنية", nameEn: "UJ School of Agriculture",     coords: [32.0030, 35.8730] as [number, number] },
  { id: "brt99-08", nameAr: "مستشفى الجامعة الأردنية",        nameEn: "Jordan University Hospital",    coords: [32.0010, 35.8750] as [number, number] },
  { id: "brt99-09", nameAr: "شارع محمود الكسواني",            nameEn: "Mahmoud Al-Kiswani Street",    coords: [31.9990, 35.8770] as [number, number] },
  { id: "brt99-10", nameAr: "شارع عبد اللطيف أبو قورة",       nameEn: "Abdel-Lateef Abu Qura Street", coords: [31.9970, 35.8790] as [number, number] },
  { id: "brt99-11", nameAr: "نفق الصحافة",                    nameEn: "Al-Sahafa Tunnel",             coords: [31.9950, 35.8810] as [number, number] },
  { id: "brt99-12", nameAr: "مختار مول",                      nameEn: "Al-Mukhtar Mall",              coords: [31.9930, 35.8830] as [number, number] },
  { id: "brt99-13", nameAr: "دوار المدينة الرياضية",          nameEn: "Sports City Circle",           coords: [31.9900, 35.8880] as [number, number], transfer: true },
  { id: "brt99-14", nameAr: "شارع عبد الحميد شرف",            nameEn: "Abdul-Hameed Sharaf Street",   coords: [31.9880, 35.8900] as [number, number] },
  { id: "brt99-15", nameAr: "شارع عمر بن عبد العزيز",         nameEn: "Omar Bin Abdul-Azeez Street",  coords: [31.9850, 35.8930] as [number, number] },
  { id: "brt99-16", nameAr: "حدائق الملك عبدالله (الجاردنز)",  nameEn: "King Abdullah Gardens",       coords: [31.9750, 35.9040] as [number, number], landmark: true },
  { id: "brt99-17", nameAr: "تقاطع وادي صقرة",                nameEn: "Wadi Saqra Intersection",      coords: [31.9720, 35.9080] as [number, number] },
  { id: "brt99-18", nameAr: "شارع مكة",                       nameEn: "Mecca Street",                 coords: [31.9700, 35.9120] as [number, number] },
  { id: "brt99-19", nameAr: "شارع محمد علي جناح",             nameEn: "Mohammad Ali Janah Street",    coords: [31.9680, 35.9150] as [number, number] },
  { id: "brt99-20", nameAr: "شارع فوزي القاوقجي",             nameEn: "Fawzi Al-Qaweqji Street",     coords: [31.9660, 35.9180] as [number, number] },
  { id: "brt99-21", nameAr: "شارع محمد علي بدير",             nameEn: "Mohmmmad Ali Bdair Street",    coords: [31.9640, 35.9200] as [number, number] },
  { id: "brt99-22", nameAr: "شارع بردى",                      nameEn: "Barda Street",                 coords: [31.9620, 35.9220] as [number, number] },
  { id: "brt99-23", nameAr: "شارع الأمير علي بن الحسين",      nameEn: "Prince Ali Bin Hussein Street",coords: [31.9600, 35.9240] as [number, number] },
  { id: "brt99-24", nameAr: "المركز الثقافي الملكي (الحسين)",  nameEn: "Hussien Cultural Center",      coords: [31.9570, 35.9270] as [number, number] },
  { id: "brt99-25", nameAr: "أمانة عمان الكبرى",              nameEn: "Greater Amman Municipality",   coords: [31.9550, 35.9300] as [number, number] },
  { id: "brt99-26", nameAr: "محطة المتحف (متحف الأردن)",      nameEn: "Jordan Museum Terminal",       coords: [31.9516, 35.9335] as [number, number], terminal: true },
];

// ─── 5. BRT ROUTE 98: Sweileh → Mahatta (via Tariq) ─────────────────────────

export const BRT_ROUTE_98_STATIONS = [
  { id: "brt98-01", nameAr: "محطة صويلح",                  nameEn: "Sweileh Terminal",         coords: [32.0185, 35.8500] as [number, number], terminal: true },
  { id: "brt98-02", nameAr: "دوار المدينة الرياضية",        nameEn: "Sports City Circle",      coords: [31.9900, 35.8880] as [number, number], transfer: true },
  { id: "brt98-03", nameAr: "الريادة",                      nameEn: "Al-Reyada",               coords: [31.9920, 35.8920] as [number, number] },
  { id: "brt98-04", nameAr: "مجمع الشمال",                   nameEn: "North Terminal",          coords: [31.9850, 35.8920] as [number, number], terminal: true },
  { id: "brt98-05", nameAr: "دائرة الأحوال المدنية",        nameEn: "Civil Status Department", coords: [31.9870, 35.8960] as [number, number] },
  { id: "brt98-06", nameAr: "عريفة مول",                     nameEn: "Areefah Mall",            coords: [31.9880, 35.9000] as [number, number] },
  { id: "brt98-07", nameAr: "محطة طارق",                     nameEn: "Tariq Terminal",          coords: [31.9900, 35.9100] as [number, number] },
  { id: "brt98-08", nameAr: "مستشفى الأمير حمزة",            nameEn: "Prince Hamzah Hospital",  coords: [31.9780, 35.9650] as [number, number] },
  { id: "brt98-09", nameAr: "مسجد أبو بكر الصديق",           nameEn: "Abu Baker Sideeq Mosque", coords: [31.9690, 35.9780] as [number, number] },
  { id: "brt98-10", nameAr: "شارع زين العابدين",             nameEn: "Zain Al-Abedeen Street",  coords: [31.9670, 35.9820] as [number, number] },
  { id: "brt98-11", nameAr: "جسر المربط - المحطة",           nameEn: "Al-Marbat-Mahatta Bridge",coords: [31.9660, 35.9840] as [number, number] },
  { id: "brt98-12", nameAr: "محطة المحطة (رأس العين)",       nameEn: "Mahatta Terminal",        coords: [31.9650, 35.9850] as [number, number], terminal: true },
];

// ─── 6. AMMAN-ZARQA BRT (Route 102/103) ──────────────────────────────────────

export const BRT_AMMAN_ZARQA_STATIONS = [
  { id: "az-01", nameAr: "محطة الزرقاء",           nameEn: "Zarqa Terminal",              coords: [32.0836, 36.1000] as [number, number], terminal: true },
  { id: "az-02", nameAr: "الهاشمية",                nameEn: "Al-Hashimiyah",               coords: [32.0600, 36.0800] as [number, number] },
  { id: "az-03", nameAr: "الرصيفة",                 nameEn: "Russeifa",                    coords: [32.0300, 36.0500] as [number, number] },
  { id: "az-04", nameAr: "بيبسي",                   nameEn: "Pepsi",                       coords: [32.0100, 36.0300] as [number, number] },
  { id: "az-05", nameAr: "ماركا",                   nameEn: "Marka",                       coords: [31.9950, 36.0100] as [number, number] },
  { id: "az-06", nameAr: "تقاطع الأمير فيصل",        nameEn: "Prince Faisal Intersection",  coords: [31.9780, 35.9900] as [number, number] },
  { id: "az-07", nameAr: "محطة المحطة (رأس العين)",  nameEn: "Mahatta Terminal",            coords: [31.9650, 35.9850] as [number, number], terminal: true },
  { id: "az-08", nameAr: "تقاطع الروضة",             nameEn: "Rawda Intersection",          coords: [31.9750, 35.9400] as [number, number] },
  { id: "az-09", nameAr: "محطة طارق",               nameEn: "Tariq Terminal",              coords: [31.9900, 35.9100] as [number, number] },
  { id: "az-10", nameAr: "عريفة مول",                nameEn: "Areefah Mall",                coords: [31.9880, 35.9000] as [number, number] },
  { id: "az-11", nameAr: "دائرة الأحوال المدنية",    nameEn: "Civil Status Department",     coords: [31.9870, 35.8960] as [number, number] },
  { id: "az-12", nameAr: "مجمع الشمال",              nameEn: "North Terminal",              coords: [31.9850, 35.8920] as [number, number] },
  { id: "az-13", nameAr: "الريادة",                  nameEn: "Al-Reyada",                   coords: [31.9920, 35.8920] as [number, number] },
  { id: "az-14", nameAr: "دوار المدينة الرياضية",    nameEn: "Sports City Circle",          coords: [31.9900, 35.8880] as [number, number] },
];

// ─── 7. MAJOR TRANSIT ROUTES (215+ from rptscitigis, mapped by terminal) ────

export interface TransitRouteOfficial {
  number?: string;
  nameAr: string;
  nameEn: string;
  fromTerminal: string;
  toDestination: string;
  mode: "city_bus" | "serveece" | "coaster" | "brt";
  operator: string;
}

export const TRANSIT_ROUTES_OFFICIAL: TransitRouteOfficial[] = [
  // ── Station Complex (مجمع المحطه) routes ──
  { number: "2",  nameAr: "مجمع المحطه - المناره",                             nameEn: "Station Complex - Manara",                              fromTerminal: "محطة المحطة", toDestination: "المنارة (جبل)",       mode: "city_bus", operator: "رؤية عمان / المتكامله" },
  { number: "6",  nameAr: "رغدان - مجمع الشمال",                                nameEn: "Raghadan - North Complex",                              fromTerminal: "رغدان",       toDestination: "مجمع الشمال",          mode: "city_bus", operator: "رؤية عمان" },
  { number: "7",  nameAr: "العبدلي - مديرية الدفاع المدني",                     nameEn: "Abdali - Civil Defense Directorate",                    fromTerminal: "العبدلي",     toDestination: "المدينة الرياضية",    mode: "city_bus", operator: "رؤية عمان" },
  { number: "8",  nameAr: "مجمع المحطه - جبل الحسين - م.الامل - دوارالداخلية",  nameEn: "Station - Jabal Hussein - Hope Sq - Interior Circle",   fromTerminal: "محطة المحطة", toDestination: "دوار الداخلية",        mode: "city_bus", operator: "المتكامله" },
  { number: "10", nameAr: "مجمع المحطه - مخيم الحسين - اخر ش.عين جالوت",         nameEn: "Station - Hussein Camp - Ain Jalut St.",                fromTerminal: "محطة المحطة", toDestination: "مخيم الحسين",          mode: "city_bus", operator: "المتكامله" },
  { number: "11", nameAr: "مجمع المحطه - جبل النزهه - دوار الضاحية",            nameEn: "Station - Jabal Nuzha - Dahiya Circle",                 fromTerminal: "محطة المحطة", toDestination: "دوار الضاحية",         mode: "city_bus", operator: "المتكامله" },
  { number: "14", nameAr: "مجمع المحطه - الهاشمي الشمالي - حي نايفه",           nameEn: "Station - North Hashmi - Nayfeh",                       fromTerminal: "محطة المحطة", toDestination: "الهاشمي الشمالي",     mode: "city_bus", operator: "المتكامله" },
  { number: "17", nameAr: "مجمع المحطه - ماركا الشمالية - حي الضباط",           nameEn: "Station - North Marka - Officers' Neighborhood",        fromTerminal: "محطة المحطة", toDestination: "ماركا الشمالية",       mode: "city_bus", operator: "المتكامله" },
  { number: "18", nameAr: "مجمع المحطه - جبل النصر - حي الامير حسن ابو نصير",   nameEn: "Station - Jabal Nasr - Prince Hassan - Abu Nsair",     fromTerminal: "محطة المحطة", toDestination: "أبو نصير",             mode: "city_bus", operator: "المتكامله" },
  { number: "19", nameAr: "مجمع المحطه - وادي النصر - مجمع الجنوب",             nameEn: "Station - Wadi Nasr - South Complex",                   fromTerminal: "محطة المحطة", toDestination: "مجمع الجنوب",          mode: "city_bus", operator: "المتكامله" },

  // ── North Complex (مجمع الشمال) routes ──
  { nameAr: "مجمع الشمال - ابو نصير",                              nameEn: "North Complex - Abu Nsair",                             fromTerminal: "مجمع الشمال", toDestination: "أبو نصير",            mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "مجمع الشمال - الجامعه الاردنية - الجبيهة - صويلح",    nameEn: "North Complex - UJ - Jubaiha - Sweileh",                fromTerminal: "مجمع الشمال", toDestination: "صويلح",              mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "مجمع الشمال - جامعة العلوم التطبيقية",                nameEn: "North Complex - Applied Science Univ.",                 fromTerminal: "مجمع الشمال", toDestination: "جامعة العلوم",       mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "مجمع الشمال - شفا بدران",                             nameEn: "North Complex - Shafa Badran",                          fromTerminal: "مجمع الشمال", toDestination: "شفا بدران",          mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "مجمع الشمال - صويلح",                                 nameEn: "North Complex - Sweileh",                               fromTerminal: "مجمع الشمال", toDestination: "صويلح",              mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "مجمع الشمال - ضاحية الياسمين",                         nameEn: "North Complex - Yasmeen Suburb",                        fromTerminal: "مجمع الشمال", toDestination: "ضاحية الياسمين",     mode: "city_bus", operator: "المتكامله" },
  { nameAr: "مجمع الشمال - ياجوز - الكوم",                          nameEn: "North Complex - Yajouz - Al-Koum",                      fromTerminal: "مجمع الشمال", toDestination: "ياجوز",              mode: "city_bus", operator: "المتكامله" },
  { number: "56", nameAr: "مجمع الشمال - وصفي التل - خلدا",         nameEn: "North Complex - Wasfi Al-Tal - Khalda",                 fromTerminal: "مجمع الشمال", toDestination: "خلدا",               mode: "city_bus", operator: "رؤية عمان" },
  { number: "56أ",nameAr: "مجمع الشمال - وصفي التل - دابوق",        nameEn: "North Complex - Wasfi Al-Tal - Dabouq",                 fromTerminal: "مجمع الشمال", toDestination: "دابوق",              mode: "city_bus", operator: "رؤية عمان" },

  // ── Sweileh (صويلح) routes ──
  { nameAr: "صويلح - الجامعه الاردنية -داخل",                       nameEn: "Sweileh - UJ - Interior",                               fromTerminal: "صويلح",       toDestination: "الجامعة الأردنية",    mode: "city_bus", operator: "المتكامله" },
  { nameAr: "صويلح - حي التلفزيون - اسكان المهندسين",               nameEn: "Sweileh - TV Neighborhood - Engineers Housing",        fromTerminal: "صويلح",       toDestination: "اسكان المهندسين",     mode: "city_bus", operator: "المتكامله" },
  { nameAr: "صويلح - شفا بدران",                                    nameEn: "Sweileh - Shafa Badran",                                fromTerminal: "صويلح",       toDestination: "شفا بدران",           mode: "city_bus", operator: "المتكامله" },

  // ── Downtown / Wasat al-Balad routes ──
  { number: "25+26", nameAr: "وسط البلد - الاشرفية",                nameEn: "Downtown - Ashrafiya",                                  fromTerminal: "وسط البلد",  toDestination: "الأشرفية",            mode: "city_bus", operator: "المتكامله" },
  { number: "27",    nameAr: "وسط البلد - الوحدات - مجمع الجنوب",    nameEn: "Downtown - Wihdat - South Complex",                    fromTerminal: "وسط البلد",  toDestination: "مجمع الجنوب",         mode: "city_bus", operator: "المتكامله" },
  { number: "28",    nameAr: "وسط البلد - راس العين - قرية الطيبات", nameEn: "Downtown - Ras Al-Ain - Taybat Village",               fromTerminal: "وسط البلد",  toDestination: "قرية الطيبات",        mode: "city_bus", operator: "رؤية عمان" },
  { number: "31",    nameAr: "وسط البلد - جبل النظيف",               nameEn: "Downtown - Jabal Al-Natheef",                          fromTerminal: "وسط البلد",  toDestination: "جبل النظيف",          mode: "city_bus", operator: "رؤية عمان" },
  { number: "32",    nameAr: "وسط البلد - جبل المريخ",               nameEn: "Downtown - Jabal Al-Mureikh",                          fromTerminal: "وسط البلد",  toDestination: "جبل المريخ",          mode: "city_bus", operator: "رؤية عمان" },
  { number: "37",    nameAr: "وسط البلد - جبل الزهور",               nameEn: "Downtown - Jabal Al-Zuhur",                            fromTerminal: "وسط البلد",  toDestination: "جبل الزهور",          mode: "city_bus", operator: "رؤية عمان" },

  // ── Wadi Al-Seer routes ──
  { number: "64",    nameAr: "وادي السير - الرباحيه",                nameEn: "Wadi Al-Seer - Rabahiya",                               fromTerminal: "وادي السير", toDestination: "الرباحية",            mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "وادي السير - ابو السوس",                nameEn: "Wadi Al-Seer - Abu Al-Sus",                             fromTerminal: "وادي السير", toDestination: "أبو السوس",           mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "وادي السير - الجامعه الاردنية - خلدا",  nameEn: "Wadi Al-Seer - UJ - Khalda",                            fromTerminal: "وادي السير", toDestination: "خلدا",                mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "وادي السير - المدينة الرياضية",         nameEn: "Wadi Al-Seer - Sports City",                            fromTerminal: "وادي السير", toDestination: "المدينة الرياضية",    mode: "city_bus", operator: "المتكامله" },

  // ── Ras Al-Ain Complex routes ──
  { number: "53",    nameAr: "مجمع راس العين - الوحدات - ابو علندا",  nameEn: "Ras Al-Ain - Wihdat - Abu Alanda",                      fromTerminal: "رأس العين",  toDestination: "أبو علندا",           mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "مجمع راس العين - اليادودة - ضاحية الملكة علياء", nameEn: "Ras Al-Ain - Yaduda - Queen Alia Suburb",        fromTerminal: "رأس العين",  toDestination: "اليادودة",           mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "مجمع راس العين - اسكان الصيادله",       nameEn: "Ras Al-Ain - Pharmacists Housing",                      fromTerminal: "رأس العين",  toDestination: "اسكان الصيادلة",     mode: "city_bus", operator: "المتكامله" },

  // ── Muhajireen Complex routes ──
  { number: "30",    nameAr: "مرج الحمام - المهاجرين",               nameEn: "Marj Al-Hamam - Muhajireen",                            fromTerminal: "المهاجرين",  toDestination: "مرج الحمام",         mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "مجمع المهاجرين - المدينة الطبية - وادي السير", nameEn: "Muhajireen - Medical City - Wadi Al-Seer",        fromTerminal: "المهاجرين",  toDestination: "وادي السير",         mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "مجمع المهاجرين - مجمع وادي السير",       nameEn: "Muhajireen - Wadi Al-Seer Complex",                     fromTerminal: "المهاجرين",  toDestination: "وادي السير",         mode: "city_bus", operator: "المتكامله" },
  {                  nameAr: "المهاجرين - ساحة النوافير - جاوا - حي النور", nameEn: "Muhajireen - Nawafir Sq - Jawa - Noor Neighborhood", fromTerminal: "المهاجرين",  toDestination: "جاوا",               mode: "city_bus", operator: "المتكامله" },

  // ── Key connector routes ──
  { number: "27ج",   nameAr: "مجمع الجنوب - مجمع الشمال",            nameEn: "South Complex - North Complex",                         fromTerminal: "مجمع الجنوب", toDestination: "مجمع الشمال",        mode: "city_bus", operator: "المتكامله" },
  { number: "54",    nameAr: "مجمع المحطه - الملكه علياء",           nameEn: "Station - Queen Alia",                                  fromTerminal: "محطة المحطة", toDestination: "ضاحية الملكة علياء", mode: "city_bus", operator: "المتكامله" },
  { number: "60",    nameAr: "جسر المربط - دوار الداخلية",           nameEn: "Marbat Bridge - Interior Circle",                       fromTerminal: "جسر المربط", toDestination: "دوار الداخلية",      mode: "city_bus", operator: "رؤية عمان" },
  { number: "61",    nameAr: "مجمع المحطه - مجمع المهاجرين",         nameEn: "Station - Muhajireen Complex",                          fromTerminal: "محطة المحطة", toDestination: "المهاجرين",          mode: "city_bus", operator: "المتكامله" },
  { number: "72",    nameAr: "المدينه الطبيه - خربه ساره",           nameEn: "Medical City - Kharibat Sara",                          fromTerminal: "المدينة الطبية", toDestination: "خربة سارة",      mode: "city_bus", operator: "رؤية عمان" },

  // ── Major serveece routes ──
  { nameAr: "سرفيس الحسين — الجاردنز ← وسط البلد",                   nameEn: "Serveece Al-Hussein: Gardens → Downtown",               fromTerminal: "الجاردنز",    toDestination: "وسط البلد",         mode: "serveece", operator: "فردية" },
  { nameAr: "سرفيس الصويفية — الصويفية ← العبدلي",                   nameEn: "Serveece Sweifieh: Sweifieh → Abdali",                  fromTerminal: "الصويفية",    toDestination: "العبدلي",           mode: "serveece", operator: "فردية" },
  { nameAr: "سرفيس عبدون — عبدون ← الصويفية",                         nameEn: "Serveece Abdoun: Abdoun → Sweifieh",                    fromTerminal: "عبدون",       toDestination: "الصويفية",          mode: "serveece", operator: "فردية" },
  { nameAr: "سرفيس الجبيهة — الجبيهة ← الجامعة الأردنية",            nameEn: "Serveece Jubaiha: Jubaiha → UJ",                        fromTerminal: "الجبيهة",     toDestination: "الجامعة الأردنية",  mode: "serveece", operator: "فردية" },
  { nameAr: "سرفيس طبربور — طبربور ← دوار ابو عليا",                 nameEn: "Serveece Tabarbour: Tabarbour → Abu Alia Circle",      fromTerminal: "طبربور",      toDestination: "دوار أبو عليا",     mode: "serveece", operator: "فردية" },
  { nameAr: "سرفيس الرابية — الرابية ← خلدا",                         nameEn: "Serveece Rabieh: Rabieh → Khalda",                      fromTerminal: "الرابية",     toDestination: "خلدا",              mode: "serveece", operator: "فردية" },

  // ── Intercity routes ──
  { nameAr: "عمان ← إربد (مجمع الشمال)",                               nameEn: "Amman → Irbid (North Complex)",                         fromTerminal: "مجمع الشمال", toDestination: "إربد",               mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← الزرقاء (مجمع الشمال)",                            nameEn: "Amman → Zarqa (North Complex)",                          fromTerminal: "مجمع الشمال", toDestination: "الزرقاء",            mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← العقبة (مجمع الجنوب)",                             nameEn: "Amman → Aqaba (South Complex)",                          fromTerminal: "مجمع الجنوب", toDestination: "العقبة",             mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← مادبا (مجمع الجنوب)",                              nameEn: "Amman → Madaba (South Complex)",                         fromTerminal: "مجمع الجنوب", toDestination: "مادبا",              mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← الكرك (مجمع الجنوب)",                              nameEn: "Amman → Karak (South Complex)",                          fromTerminal: "مجمع الجنوب", toDestination: "الكرك",              mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← جرش (مجمع الشمال)",                                nameEn: "Amman → Jerash (North Complex)",                         fromTerminal: "مجمع الشمال", toDestination: "جرش",                mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← عجلون (مجمع الشمال)",                              nameEn: "Amman → Ajloun (North Complex)",                         fromTerminal: "مجمع الشمال", toDestination: "عجلون",              mode: "city_bus", operator: "ملكية" },
  { nameAr: "عمان ← المفرق (مجمع الشمال)",                             nameEn: "Amman → Mafraq (North Complex)",                         fromTerminal: "مجمع الشمال", toDestination: "المفرق",             mode: "city_bus", operator: "ملكية" },

  // ── Amman Vision (رؤية عمان) feeder routes ──
  { nameAr: "المدينة الرياضية - الدوار الثامن",                        nameEn: "Sports City - 8th Circle",                              fromTerminal: "المدينة الرياضية", toDestination: "الدوار الثامن", mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "دوار المدينة الرياضية - مجمع الاعمال",                    nameEn: "Sports City Circle - Business Complex",                fromTerminal: "المدينة الرياضية", toDestination: "مجمع الأعمال",    mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "دوار خلدا - دوار الجمرك",                                 nameEn: "Khalda Circle - Customs Circle",                        fromTerminal: "خلدا",        toDestination: "الجمرك",            mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "دوار صويلح - جسر البوليتكنك",                             nameEn: "Sweileh Circle - Polytechnic Bridge",                   fromTerminal: "صويلح",       toDestination: "البوليتكنك",        mode: "city_bus", operator: "رؤية عمان" },
  { nameAr: "دوار صويلح - مجمع المحطه",                                nameEn: "Sweileh Circle - Station Complex",                      fromTerminal: "صويلح",       toDestination: "محطة المحطة",       mode: "city_bus", operator: "رؤية عمان" },
];

// ─── 8. JORDAN GOVERNORATE INTERCITY TERMINALS ──────────────────────────────

export const INTERCITY_TERMINALS = [
  { id: "ic-amman-north",     nameAr: "مجمع سفريات الشمال — عمان",     nameEn: "Amman North Bus Terminal",       coords: [31.9850, 35.8920] as [number, number], serves: ["إربد", "الزرقاء", "المفرق", "جرش", "عجلون"] },
  { id: "ic-amman-south",     nameAr: "مجمع سفريات الجنوب — عمان",     nameEn: "Amman South Bus Terminal",       coords: [31.9180, 35.9350] as [number, number], serves: ["العقبة", "الكرك", "الطفيلة", "معان", "مادبا"] },
  { id: "ic-irbid",           nameAr: "مجمع عمان الجديد — إربد",      nameEn: "Irbid New Amman Terminal",        coords: [32.5360, 35.8510] as [number, number], serves: ["عمان", "الزرقاء", "المفرق"] },
  { id: "ic-zarqa",           nameAr: "مجمع الزرقاء",                   nameEn: "Zarqa Bus Terminal",              coords: [32.0836, 36.1000] as [number, number], serves: ["عمان", "إربد", "المفرق"] },
  { id: "ic-aqaba",           nameAr: "مجمع العقبة",                    nameEn: "Aqaba Bus Terminal",              coords: [29.5319, 35.0056] as [number, number], serves: ["عمان", "معان", "وادي رم"] },
  { id: "ic-madaba",          nameAr: "مجمع مادبا",                     nameEn: "Madaba Bus Terminal",             coords: [31.7190, 35.7930] as [number, number], serves: ["عمان", "الكرك"] },
  { id: "ic-karak",           nameAr: "مجمع الكرك",                     nameEn: "Karak Bus Terminal",              coords: [31.1800, 35.7000] as [number, number], serves: ["عمان", "الطفيلة", "العقبة"] },
  { id: "ic-jerash",          nameAr: "مجمع جرش",                       nameEn: "Jerash Bus Terminal",             coords: [32.2770, 35.8950] as [number, number], serves: ["عمان", "إربد", "عجلون"] },
] as const;

// ─── 9. VEHICLE TYPES ────────────────────────────────────────────────────────

export const VEHICLE_TYPES = [
  { key: "bus",       nameAr: "حافلة",   nameEn: "Bus",     icon: "🚌" },
  { key: "serveece",  nameAr: "سرفيس",   nameEn: "Serveece",icon: "🚐" },
  { key: "coaster",   nameAr: "كوستر",   nameEn: "Coaster", icon: "🚌" },
  { key: "brt",       nameAr: "باص سريع",nameEn: "BRT Bus",  icon: "⚡" },
] as const;

// ─── EXPORT ALL ──────────────────────────────────────────────────────────────

export const AMMAN_TRANSIT_DATA = {
  terminals: DEPARTURE_TERMINALS,
  operators: OPERATORS,
  brtLines: BRT_LINES,
  brtRoute99Stations: BRT_ROUTE_99_STATIONS,
  brtRoute98Stations: BRT_ROUTE_98_STATIONS,
  brtAmmanZarqaStations: BRT_AMMAN_ZARQA_STATIONS,
  transitRoutes: TRANSIT_ROUTES_OFFICIAL,
  intercityTerminals: INTERCITY_TERMINALS,
  vehicleTypes: VEHICLE_TYPES,
};
