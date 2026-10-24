// Data juz Al-Qur'an: rentang surah & ayat tiap juz.
// Batas juz: api.alquran.cloud/v1/meta · Nama surah: api.quran.com (name_simple).
// SURAHS[nomor-1] = [nama, jumlah ayat]
export const SURAHS=[
 ["Al-Fatihah",7],["Al-Baqarah",286],["Ali 'Imran",200],["An-Nisa",176],["Al-Ma'idah",120],["Al-An'am",165],
 ["Al-A'raf",206],["Al-Anfal",75],["At-Tawbah",129],["Yunus",109],["Hud",123],["Yusuf",111],
 ["Ar-Ra'd",43],["Ibrahim",52],["Al-Hijr",99],["An-Nahl",128],["Al-Isra",111],["Al-Kahf",110],
 ["Maryam",98],["Taha",135],["Al-Anbya",112],["Al-Hajj",78],["Al-Mu'minun",118],["An-Nur",64],
 ["Al-Furqan",77],["Ash-Shu'ara",227],["An-Naml",93],["Al-Qasas",88],["Al-'Ankabut",69],["Ar-Rum",60],
 ["Luqman",34],["As-Sajdah",30],["Al-Ahzab",73],["Saba",54],["Fatir",45],["Ya-Sin",83],
 ["As-Saffat",182],["Sad",88],["Az-Zumar",75],["Ghafir",85],["Fussilat",54],["Ash-Shuraa",53],
 ["Az-Zukhruf",89],["Ad-Dukhan",59],["Al-Jathiyah",37],["Al-Ahqaf",35],["Muhammad",38],["Al-Fath",29],
 ["Al-Hujurat",18],["Qaf",45],["Adh-Dhariyat",60],["At-Tur",49],["An-Najm",62],["Al-Qamar",55],
 ["Ar-Rahman",78],["Al-Waqi'ah",96],["Al-Hadid",29],["Al-Mujadila",22],["Al-Hashr",24],["Al-Mumtahanah",13],
 ["As-Saf",14],["Al-Jumu'ah",11],["Al-Munafiqun",11],["At-Taghabun",18],["At-Talaq",12],["At-Tahrim",12],
 ["Al-Mulk",30],["Al-Qalam",52],["Al-Haqqah",52],["Al-Ma'arij",44],["Nuh",28],["Al-Jinn",28],
 ["Al-Muzzammil",20],["Al-Muddaththir",56],["Al-Qiyamah",40],["Al-Insan",31],["Al-Mursalat",50],["An-Naba",40],
 ["An-Nazi'at",46],["'Abasa",42],["At-Takwir",29],["Al-Infitar",19],["Al-Mutaffifin",36],["Al-Inshiqaq",25],
 ["Al-Buruj",22],["At-Tariq",17],["Al-A'la",19],["Al-Ghashiyah",26],["Al-Fajr",30],["Al-Balad",20],
 ["Ash-Shams",15],["Al-Layl",21],["Ad-Duhaa",11],["Ash-Sharh",8],["At-Tin",8],["Al-'Alaq",19],
 ["Al-Qadr",5],["Al-Bayyinah",8],["Az-Zalzalah",8],["Al-'Adiyat",11],["Al-Qari'ah",11],["At-Takathur",8],
 ["Al-'Asr",3],["Al-Humazah",9],["Al-Fil",5],["Quraysh",4],["Al-Ma'un",7],["Al-Kawthar",3],
 ["Al-Kafirun",6],["An-Nasr",3],["Al-Masad",5],["Al-Ikhlas",4],["Al-Falaq",5],["An-Nas",6],
];

// JUZ[nomor-1] = [[nomorSurah, ayatAwal, ayatAkhir], ...]
export const JUZ=[
 [[1,1,7],[2,1,141]],
 [[2,142,252]],
 [[2,253,286],[3,1,92]],
 [[3,93,200],[4,1,23]],
 [[4,24,147]],
 [[4,148,176],[5,1,81]],
 [[5,82,120],[6,1,110]],
 [[6,111,165],[7,1,87]],
 [[7,88,206],[8,1,40]],
 [[8,41,75],[9,1,92]],
 [[9,93,129],[10,1,109],[11,1,5]],
 [[11,6,123],[12,1,52]],
 [[12,53,111],[13,1,43],[14,1,52]],
 [[15,1,99],[16,1,128]],
 [[17,1,111],[18,1,74]],
 [[18,75,110],[19,1,98],[20,1,135]],
 [[21,1,112],[22,1,78]],
 [[23,1,118],[24,1,64],[25,1,20]],
 [[25,21,77],[26,1,227],[27,1,55]],
 [[27,56,93],[28,1,88],[29,1,45]],
 [[29,46,69],[30,1,60],[31,1,34],[32,1,30],[33,1,30]],
 [[33,31,73],[34,1,54],[35,1,45],[36,1,27]],
 [[36,28,83],[37,1,182],[38,1,88],[39,1,31]],
 [[39,32,75],[40,1,85],[41,1,46]],
 [[41,47,54],[42,1,53],[43,1,89],[44,1,59],[45,1,37]],
 [[46,1,35],[47,1,38],[48,1,29],[49,1,18],[50,1,45],[51,1,30]],
 [[51,31,60],[52,1,49],[53,1,62],[54,1,55],[55,1,78],[56,1,96],[57,1,29]],
 [[58,1,22],[59,1,24],[60,1,13],[61,1,14],[62,1,11],[63,1,11],[64,1,18],[65,1,12],[66,1,12]],
 [[67,1,30],[68,1,52],[69,1,52],[70,1,44],[71,1,28],[72,1,28],[73,1,20],[74,1,56],[75,1,40],[76,1,31],[77,1,50]],
 [[78,1,40],[79,1,46],[80,1,42],[81,1,29],[82,1,19],[83,1,36],[84,1,25],[85,1,22],[86,1,17],[87,1,19],[88,1,26],[89,1,30],[90,1,20],[91,1,15],[92,1,21],[93,1,11],[94,1,8],[95,1,8],[96,1,19],[97,1,5],[98,1,8],[99,1,8],[100,1,11],[101,1,11],[102,1,8],[103,1,3],[104,1,9],[105,1,5],[106,1,4],[107,1,7],[108,1,3],[109,1,6],[110,1,3],[111,1,5],[112,1,4],[113,1,5],[114,1,6]],
];

/** Daftar surah + rentang ayat pada satu juz (1-30). */
export function juzEntries(juz){
 const list=JUZ[Math.min(30,Math.max(1,Number(juz)||1))-1]||[];
 return list.map(([n,from,to])=>({number:n,name:SURAHS[n-1][0],from,to}));
}
