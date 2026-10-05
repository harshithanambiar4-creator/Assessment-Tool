// Word-style AutoCorrect: common misspellings and typos that get fixed as soon as the writer types
// a space or punctuation after them. Only used when the coach picks "Underline + autocorrect" for a batch.
//
// To add a word: put "misspelling": "correction" on its own line below (misspelling in lower case).
// Leave out anything that is a real word (e.g. "cant", "wont", "its") and anything spelled differently
// in British and American English, so nobody's correct spelling ever gets "fixed".
const LIST = {
  // Typos
  teh: "the", hte: "the", taht: "that", thier: "their", adn: "and", nad: "and", waht: "what",
  wiht: "with", whith: "with", jsut: "just", knwo: "know", konw: "know", thsi: "this", tihs: "this",
  ahve: "have", hvae: "have", yuo: "you", yoru: "your", tehy: "they", whcih: "which", wich: "which",
  becuase: "because", beacuse: "because", becasue: "because", beacause: "because", agian: "again",
  togehter: "together", alwasy: "always",

  // "I" and missing apostrophes
  i: "I", "i'm": "I'm", "i've": "I've", "i'll": "I'll", "i'd": "I'd", im: "I'm", ive: "I've",
  dont: "don't", didnt: "didn't", doesnt: "doesn't", isnt: "isn't", wasnt: "wasn't", werent: "weren't",
  arent: "aren't", couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't", havent: "haven't",
  hasnt: "hasn't", hadnt: "hadn't", mustnt: "mustn't", neednt: "needn't", thats: "that's",
  whats: "what's", theres: "there's", youre: "you're", theyre: "they're", youve: "you've",
  weve: "we've", theyve: "they've", youll: "you'll", theyll: "they'll", wouldve: "would've",
  couldve: "could've", shouldve: "should've",

  // Days and months (Word capitalises these; "may", "march" and "august" are left alone)
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday",
  saturday: "Saturday", sunday: "Sunday", january: "January", february: "February", april: "April",
  june: "June", july: "July", september: "September", october: "October", november: "November",
  december: "December", februrary: "February", feburary: "February",

  // Common misspellings
  abscence: "absence", accidently: "accidentally", accomodate: "accommodate", accomodation: "accommodation",
  acording: "according", accross: "across", acheive: "achieve", acheived: "achieved", acheivement: "achievement",
  acheiving: "achieving", acknowlege: "acknowledge", acquaintence: "acquaintance", adress: "address",
  adressed: "addressed", adolecent: "adolescent", advertisment: "advertisement", agressive: "aggressive",
  alledged: "alleged", allready: "already", allways: "always", alot: "a lot", amatuer: "amateur", amung: "among",
  anoying: "annoying", anual: "annual", aparent: "apparent", apparant: "apparent", apparantly: "apparently",
  appearence: "appearance", aquire: "acquire", arguement: "argument", arround: "around",
  assasination: "assassination", attendence: "attendance", awfull: "awful", basicly: "basically",
  basicaly: "basically", beatiful: "beautiful", beautifull: "beautiful", begining: "beginning",
  beggining: "beginning", beginer: "beginner", beleif: "belief", beleive: "believe", beleived: "believed",
  belive: "believe", benifit: "benefit", biulding: "building", bizzare: "bizarre", buisness: "business",
  bussiness: "business", calender: "calendar", carefull: "careful", catagory: "category", cemetary: "cemetery",
  changable: "changeable", cheif: "chief", cieling: "ceiling", collegue: "colleague", colum: "column",
  comming: "coming", commitee: "committee", comittee: "committee", committment: "commitment",
  completly: "completely", completley: "completely", comunity: "community", comunication: "communication",
  concensus: "consensus", concious: "conscious", consciencious: "conscientious", contraversy: "controversy",
  conveniant: "convenient", critisism: "criticism", curiousity: "curiosity", decieve: "deceive",
  definately: "definitely", definatly: "definitely", definitly: "definitely", desparate: "desperate",
  develope: "develop", developement: "development", diffrent: "different", differnt: "different",
  dilemna: "dilemma", disipline: "discipline", dissapear: "disappear", dissappear: "disappear",
  dissapoint: "disappoint", dissapointed: "disappointed", efficent: "efficient", eigth: "eighth",
  embarass: "embarrass", embarassed: "embarrassed", embarassing: "embarrassing", enterpreneur: "entrepreneur",
  entreprenuer: "entrepreneur", enviroment: "environment", enviorment: "environment",
  enviromental: "environmental", equiptment: "equipment", especialy: "especially", exagerate: "exaggerate",
  excede: "exceed", excellant: "excellent", exellent: "excellent", excercise: "exercise", existance: "existence",
  existant: "existent", expecially: "especially", experiance: "experience", experince: "experience",
  explaination: "explanation", facinating: "fascinating", familar: "familiar", finaly: "finally", firey: "fiery",
  foriegn: "foreign", forseeable: "foreseeable", fourty: "forty", foward: "forward", freind: "friend",
  freinds: "friends", freindly: "friendly", fundemental: "fundamental", futher: "further", gaurd: "guard",
  gaurantee: "guarantee", guarentee: "guarantee", generaly: "generally", goverment: "government",
  govenment: "government", grammer: "grammar", greatful: "grateful", gratefull: "grateful", guidence: "guidance",
  hapen: "happen", hapened: "happened", happend: "happened", harrass: "harass", harrassment: "harassment",
  heighth: "height", hieght: "height", helpfull: "helpful", hipocrite: "hypocrite",
  hopefuly: "hopefully", humourous: "humorous", ignorence: "ignorance", imaginery: "imaginary", immitate: "imitate",
  immediatly: "immediately", immediatley: "immediately", importent: "important", incase: "in case",
  incidently: "incidentally", independant: "independent", indispensible: "indispensable", infact: "in fact",
  inspite: "in spite", intelligance: "intelligence", interferance: "interference", intergrate: "integrate",
  interupt: "interrupt", intresting: "interesting", intrested: "interested", irrelevent: "irrelevant",
  irresistable: "irresistible", jist: "gist", knowlege: "knowledge", knowledgable: "knowledgeable",
  labratory: "laboratory", laguage: "language", langauge: "language", leasure: "leisure", liesure: "leisure",
  lenght: "length", liason: "liaison", libary: "library", lonelyness: "loneliness", maintainance: "maintenance",
  maintenence: "maintenance", managment: "management", mantain: "maintain", marrage: "marriage",
  mathmatics: "mathematics", mearly: "merely", millenium: "millennium", miniscule: "minuscule",
  mischievious: "mischievous", mispell: "misspell", mispelled: "misspelled", morgage: "mortgage",
  mysterous: "mysterious", naturaly: "naturally", neccessary: "necessary", neccesary: "necessary",
  necessery: "necessary", neccessarily: "necessarily", negociate: "negotiate", neice: "niece", ninty: "ninety",
  noone: "no one", noticable: "noticeable", nusiance: "nuisance", obediance: "obedience", ocasion: "occasion",
  occassion: "occasion", occassionally: "occasionally", occured: "occurred", ocurred: "occurred",
  occurence: "occurrence", occurance: "occurrence", occurrance: "occurrence", occurr: "occur",
  offically: "officially", ommit: "omit", ommited: "omitted", oppinion: "opinion", opinon: "opinion",
  oppertunity: "opportunity", oppurtunity: "opportunity", opportunty: "opportunity", origional: "original",
  paralell: "parallel", parliment: "parliament", particuliar: "particular", paticular: "particular",
  pasttime: "pastime", peculier: "peculiar", peice: "piece", percieve: "perceive", perfomance: "performance",
  performence: "performance", permenant: "permanent", perminent: "permanent", perseverence: "perseverance",
  persistant: "persistent", personaly: "personally", persue: "pursue", phenomenom: "phenomenon",
  physcial: "physical", politican: "politician", portugese: "Portuguese", posession: "possession",
  possesion: "possession", posible: "possible", potatos: "potatoes", practicly: "practically",
  preceeding: "preceding", prefered: "preferred", presance: "presence", prescence: "presence", presense: "presence",
  privelege: "privilege", priviledge: "privilege", probaly: "probably", probly: "probably", procede: "proceed",
  proceedure: "procedure", proffesional: "professional", profesional: "professional", prominant: "prominent",
  pronounciation: "pronunciation", propoganda: "propaganda", publically: "publicly", pursuade: "persuade",
  quantaty: "quantity", quarentine: "quarantine", questionaire: "questionnaire", realy: "really",
  reccomend: "recommend", recomend: "recommend", reccommend: "recommend", reccuring: "recurring",
  recurrance: "recurrence", reciept: "receipt", recieve: "receive", recieved: "received", recieving: "receiving",
  rediculous: "ridiculous", refered: "referred", refrence: "reference", relevent: "relevant", religous: "religious",
  remeber: "remember", remembrence: "remembrance", repitition: "repetition", reponse: "response",
  reponsible: "responsible", responsable: "responsible", responsability: "responsibility", rescource: "resource",
  resouce: "resource", resistence: "resistance", resturant: "restaurant", restaraunt: "restaurant", rythm: "rhythm",
  sacrafice: "sacrifice", saftey: "safety", sargent: "sergeant", scedule: "schedule", shedule: "schedule",
  secratary: "secretary", sence: "sense", sentance: "sentence", sentense: "sentence", seperate: "separate",
  seperated: "separated", seperately: "separately", sieze: "seize", significent: "significant", similiar: "similar",
  simpley: "simply", sincerly: "sincerely", sinse: "since", soley: "solely", speach: "speech",
  stategy: "strategy", stragety: "strategy", stoped: "stopped", strech: "stretch", strenght: "strength",
  studing: "studying", sucess: "success", succeded: "succeeded", succesful: "successful", successfull: "successful",
  sucessful: "successful", succesfully: "successfully", sucessfully: "successfully", sufficent: "sufficient",
  sumary: "summary", supercede: "supersede", supress: "suppress", suprise: "surprise", suprised: "surprised",
  suround: "surround", tatoo: "tattoo", teached: "taught", tecnology: "technology", technolgy: "technology",
  temperture: "temperature", tendancy: "tendency", theif: "thief", thourough: "thorough", threshhold: "threshold",
  tommorow: "tomorrow", tomorow: "tomorrow", tommorrow: "tomorrow", tounge: "tongue", tradgedy: "tragedy",
  transfered: "transferred", truely: "truly", truley: "truly", twelth: "twelfth", unecessary: "unnecessary",
  unneccessary: "unnecessary", unforseen: "unforeseen", unfortunatly: "unfortunately",
  unfortunatley: "unfortunately", untill: "until", unusualy: "unusually", usefull: "useful", useing: "using",
  usualy: "usually", vaccuum: "vacuum", vacume: "vacuum", vegatable: "vegetable", vehical: "vehicle",
  visable: "visible", wellcome: "welcome", whereever: "wherever", wierd: "weird", withdrawl: "withdrawal",
  wonderfull: "wonderful", writen: "written", writting: "writing", yatch: "yacht", yeild: "yield",
  youself: "yourself",
};

// Returns the corrected word, keeping the writer's capitals ("Teh" → "The", "TEH" → "THE"), or null.
export function autocorrectWord(word) {
  const fix = LIST[word.toLowerCase()];
  if (!fix || fix === word) return null;
  if (word.length > 1 && word === word.toUpperCase()) return fix.toUpperCase();
  if (word[0] === word[0].toUpperCase()) return fix[0].toUpperCase() + fix.slice(1);
  return fix;
}

export const SPELLING_MODES = {
  off: { label: "Off", help: "No red underlines and no autocorrect. Phone keyboards are asked not to correct either." },
  underline: { label: "Underline mistakes", help: "Misspelled words get a red underline; right-click shows suggestions. Nothing is changed automatically." },
  autocorrect: { label: "Underline + autocorrect", help: "As above, and common misspellings (\"teh\", \"recieve\", \"i\") are fixed as they type, like Word. Not counted as pasting." },
};
