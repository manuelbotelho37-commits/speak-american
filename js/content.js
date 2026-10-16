// SPEAK AMERICAN — contenu pédagogique (anglais américain, explications en français)
// Chaque mot : en, fr, ph (prononciation simplifiée pour francophone), ipa (américain),
// ex / exFr (exemple), tip (astuce mémoire), emoji, dlg (mini-dialogue), sound (son travaillé)

const V = (day, list) => list.map((a, i) => ({
  id: `d${day}_${i + 1}`, day,
  en: a[0], fr: a[1], ph: a[2], ipa: a[3], ex: a[4], exFr: a[5], tip: a[6], emoji: a[7],
  dlg: a[8] || [], sound: a[9] || null,
}));

export const VOCAB = [
  ...V(1, [
    ["Hello", "Bonjour (à toute heure)", "hè-LÔ", "/həˈloʊ/", "Hello, I'm Manu.", "Bonjour, je suis Manu.", "Le H se souffle, comme quand on embue une vitre : « Hhhello ».", "👋", [["A", "Hello!", "Bonjour !"], ["B", "Hello! How are you?", "Bonjour ! Comment ça va ?"]], "h"],
    ["Hi", "Salut", "HAÏ", "/haɪ/", "Hi, Sarah!", "Salut, Sarah !", "« Hi » = « aïe » avec un souffle devant. Très utilisé, même avec des inconnus.", "🙂", [["A", "Hi there!", "Salut !"], ["B", "Hi! Nice day, huh?", "Salut ! Belle journée, hein ?"]], "h"],
    ["Good morning", "Bonjour (le matin)", "goud MOR-ning", "/ɡʊd ˈmɔrnɪŋ/", "Good morning, Alex!", "Bonjour, Alex !", "Morning = « matin ». Le R américain : la langue recule sans toucher le palais.", "🌅", [["A", "Good morning!", "Bonjour !"], ["B", "Morning! Coffee?", "Bonjour ! Un café ?"]], "r"],
    ["How are you?", "Comment allez-vous ? / Ça va ?", "HAOU ar YOU", "/haʊ ɑr ju/", "Hi Michael, how are you?", "Salut Michael, comment ça va ?", "Les Américains le disent très vite : « haou-ya ». C'est une formule de politesse.", "❓", [["A", "How are you?", "Comment ça va ?"], ["B", "Good, thanks. And you?", "Bien, merci. Et toi ?"]], "intonation"],
    ["I'm fine, thanks", "Je vais bien, merci", "aïm FAÏN, THènks", "/aɪm faɪn θæŋks/", "I'm fine, thanks. And you?", "Je vais bien, merci. Et vous ?", "TH : le bout de la langue entre les dents, puis souffler. Pas « S », pas « F ».", "😊", [["A", "How are you?", "Comment ça va ?"], ["B", "I'm fine, thanks!", "Je vais bien, merci !"]], "th_unvoiced"],
  ]),
  ...V(2, [
    ["My name is…", "Je m'appelle…", "maï NÈÏM iz", "/maɪ neɪm ɪz/", "My name is Manu.", "Je m'appelle Manu.", "Name rime avec « game ». Appuyez sur NAME.", "🪪", [["A", "What's your name?", "Comment tu t'appelles ?"], ["B", "My name is Manu.", "Je m'appelle Manu."]], "stress"],
    ["Nice to meet you", "Enchanté(e)", "NAÏS tou MIT-you", "/naɪs tə mit ju/", "Nice to meet you, Sarah.", "Enchanté, Sarah.", "À l'oral, « meet you » devient « mii-tchou ».", "🤝", [["A", "I'm Sarah.", "Je suis Sarah."], ["B", "Nice to meet you, Sarah!", "Enchanté, Sarah !"]], "linking"],
    ["What's your name?", "Comment vous appelez-vous ?", "OUATS yor NÈÏM", "/wʌts jʊr neɪm/", "Hi! What's your name?", "Salut ! Comment tu t'appelles ?", "What's = what is. Le W se fait avec les lèvres en rond, comme « ou ».", "❔", [["A", "What's your name?", "Comment tu t'appelles ?"], ["B", "I'm David.", "Je suis David."]], "w"],
    ["I'm from France", "Je viens de France", "aïm from FRÈNS", "/aɪm frʌm fræns/", "I'm from France, from Lyon.", "Je viens de France, de Lyon.", "France se dit « Frènns », avec un R américain.", "🇫🇷", [["A", "Where are you from?", "D'où viens-tu ?"], ["B", "I'm from France.", "Je viens de France."]], "r"],
    ["I'm French", "Je suis français", "aïm FRÈNTCH", "/aɪm frɛntʃ/", "I'm French, but I love America.", "Je suis français, mais j'adore l'Amérique.", "French finit par « tch », comme dans « tchin-tchin ».", "🥖", [["A", "Are you French?", "Tu es français ?"], ["B", "Yes, I'm French.", "Oui, je suis français."]], "r"],
  ]),
  ...V(3, [
    ["Please", "S'il vous plaît", "PLIIZ", "/pliz/", "A coffee, please.", "Un café, s'il vous plaît.", "Un « i » long et un Z à la fin : « pliiiz ».", "🙏", [["A", "Water, please.", "De l'eau, s'il vous plaît."], ["B", "Sure!", "Bien sûr !"]], "ee_i"],
    ["Thank you", "Merci", "THènk you", "/ˈθæŋk ju/", "Thank you very much!", "Merci beaucoup !", "Langue entre les dents pour TH. Pensez « Thank » = « Tank » avec un souffle.", "💐", [["A", "Here you go.", "Voilà."], ["B", "Thank you!", "Merci !"]], "th_unvoiced"],
    ["You're welcome", "De rien / Je vous en prie", "yor OUÈL-keum", "/jʊr ˈwɛlkəm/", "— Thanks! — You're welcome.", "— Merci ! — De rien.", "Welcome = « bienvenue » : on accueille votre merci.", "🤗", [["A", "Thank you!", "Merci !"], ["B", "You're welcome!", "De rien !"]], "w"],
    ["Excuse me", "Excusez-moi (pour attirer l'attention)", "ik-SKIOUZ mi", "/ɪkˈskjuz mi/", "Excuse me, where is the restroom?", "Excusez-moi, où sont les toilettes ?", "On l'utilise AVANT de déranger quelqu'un. « Sorry », c'est APRÈS.", "✋", [["A", "Excuse me?", "Excusez-moi ?"], ["B", "Yes? Can I help you?", "Oui ? Je peux vous aider ?"]], "stress"],
    ["Sorry", "Pardon / Désolé", "SA-ri", "/ˈsɑri/", "Oh, sorry!", "Oh, pardon !", "Les Américains disent « SA-ri », bouche bien ouverte.", "😅", [["A", "Ouch!", "Aïe !"], ["B", "Oh, I'm so sorry!", "Oh, je suis vraiment désolé !"]], "r"],
  ]),
  ...V(4, [
    ["Yes", "Oui", "YÈS", "/jɛs/", "Yes, please.", "Oui, s'il vous plaît.", "Souvent « Yeah » (yèa) entre amis.", "✅", [["A", "Do you want coffee?", "Tu veux un café ?"], ["B", "Yes, please!", "Oui, volontiers !"]], null],
    ["No", "Non", "NÔOU", "/noʊ/", "No, thank you.", "Non, merci.", "« No » se termine en glissant vers « ou » : « nôou ».", "❌", [["A", "More water?", "Encore de l'eau ?"], ["B", "No, thank you.", "Non, merci."]], null],
    ["I don't understand", "Je ne comprends pas", "aï DÔNT eun-deur-STÈND", "/aɪ doʊnt ˌʌndərˈstænd/", "Sorry, I don't understand.", "Désolé, je ne comprends pas.", "Phrase de survie n°1. Pas de honte : les Américains ralentissent volontiers.", "🤷", [["A", "Do you want it to go?", "C'est à emporter ?"], ["B", "Sorry, I don't understand.", "Désolé, je ne comprends pas."]], "contractions"],
    ["Could you repeat that?", "Pouvez-vous répéter ?", "koud-you ri-PIT THat", "/kʊd ju rɪˈpit ðæt/", "Could you repeat that, please?", "Pouvez-vous répéter, s'il vous plaît ?", "Le L de « could » ne se prononce pas : « koud ».", "🔁", [["A", "It's two ninety-nine.", "C'est 2,99."], ["B", "Could you repeat that?", "Pouvez-vous répéter ?"]], "th_voiced"],
    ["Slowly, please", "Lentement, s'il vous plaît", "SLÔOU-li, PLIIZ", "/ˈsloʊli pliz/", "Can you speak slowly, please?", "Pouvez-vous parler lentement, s'il vous plaît ?", "Slow = lent → slowly = lentement (-ly = -ment).", "🐢", [["A", "Sorry, slowly, please.", "Pardon, lentement, s'il vous plaît."], ["B", "Of course. It's… two… ninety-nine.", "Bien sûr. C'est… deux… quatre-vingt-dix-neuf."]], null],
  ]),
  ...V(5, [
    ["Goodbye", "Au revoir", "goud-BAÏ", "/ɡʊdˈbaɪ/", "Goodbye, Alex!", "Au revoir, Alex !", "Entre amis on dit plutôt « Bye! » ou « Bye-bye! ».", "👋", [["A", "Goodbye!", "Au revoir !"], ["B", "Bye! See you!", "Salut ! À plus !"]], null],
    ["See you later", "À plus tard", "SI you LÈÏ-deur", "/si ju ˈleɪtər/", "See you later, Sarah!", "À plus tard, Sarah !", "En américain, le T entre deux voyelles devient un D doux : « lay-der ».", "⏰", [["A", "I have to go.", "Je dois y aller."], ["B", "OK, see you later!", "D'accord, à plus tard !"]], "flap_t"],
    ["Have a nice day", "Bonne journée", "HÈV-a NAÏS DÈÏ", "/hæv ə naɪs deɪ/", "Thank you, have a nice day!", "Merci, bonne journée !", "Phrase entendue partout aux USA. Réponse : « You too! ».", "☀️", [["A", "Have a nice day!", "Bonne journée !"], ["B", "Thanks, you too!", "Merci, vous aussi !"]], "h"],
    ["Take care", "Prends soin de toi", "TÈÏK KÈR", "/teɪk kɛr/", "Bye, take care!", "Salut, prends soin de toi !", "Care = « soin ». Un au revoir chaleureux.", "💙", [["A", "Take care!", "Prends soin de toi !"], ["B", "You too!", "Toi aussi !"]], "r"],
    ["See you tomorrow", "À demain", "SI you tou-MA-rôou", "/si ju təˈmɑroʊ/", "See you tomorrow at nine.", "À demain à neuf heures.", "To-MOR-row : l'accent est au milieu.", "📅", [["A", "See you tomorrow!", "À demain !"], ["B", "See you!", "À plus !"]], "stress"],
  ]),
  ...V(6, [
    ["Where are you from?", "D'où venez-vous ?", "OUÈR ar you FROM", "/wɛr ɑr ju frʌm/", "Nice to meet you! Where are you from?", "Enchanté ! D'où venez-vous ?", "La question monte puis descend sur « from ».", "🌍", [["A", "Where are you from?", "D'où viens-tu ?"], ["B", "I'm from France. And you?", "De France. Et toi ?"]], "w"],
    ["I live in…", "J'habite à / en…", "aï LIV in", "/aɪ lɪv ɪn/", "I live in France, near Lyon.", "J'habite en France, près de Lyon.", "Live : « i » court. Leave (partir) : « ii » long. Attention !", "🏡", [["A", "Where do you live?", "Où habites-tu ?"], ["B", "I live in France.", "J'habite en France."]], "ee_i"],
    ["I'm on vacation", "Je suis en vacances", "aïm on vèï-KÈÏ-cheun", "/aɪm ɑn veɪˈkeɪʃən/", "I'm on vacation in New York.", "Je suis en vacances à New York.", "Les Américains disent « vacation » (les Anglais « holiday »).", "🏖️", [["A", "Are you here for work?", "Tu es là pour le travail ?"], ["B", "No, I'm on vacation!", "Non, je suis en vacances !"]], "stress"],
    ["I'm learning English", "J'apprends l'anglais", "aïm LEUR-ning ING-lich", "/aɪm ˈlɜrnɪŋ ˈɪŋɡlɪʃ/", "I'm learning English with Alex.", "J'apprends l'anglais avec Alex.", "Learn : le « eu » américain avec un R, « leurn ».", "📚", [["A", "Your English is good!", "Ton anglais est bon !"], ["B", "Thanks, I'm learning English.", "Merci, j'apprends l'anglais."]], "r"],
    ["A little", "Un peu", "a LI-deul", "/ə ˈlɪtəl/", "I speak a little English.", "Je parle un peu anglais.", "Le T américain devient un D léger : « li-deul ».", "🤏", [["A", "Do you speak English?", "Tu parles anglais ?"], ["B", "A little!", "Un peu !"]], "flap_t"],
  ]),
  ...V(8, [
    ["One, two, three", "Un, deux, trois", "OUANN, TOU, THRII", "/wʌn tu θri/", "One, two, three… go!", "Un, deux, trois… partez !", "Three commence par TH : langue entre les dents. « Tree » = arbre !", "1️⃣", [["A", "How many?", "Combien ?"], ["B", "Three, please.", "Trois, s'il vous plaît."]], "th_unvoiced"],
    ["Four, five, six", "Quatre, cinq, six", "FOR, FAÏV, SIKS", "/fɔr faɪv sɪks/", "Table for four, please.", "Une table pour quatre, s'il vous plaît.", "Four = for (pour) : même son !", "4️⃣", [["A", "How many people?", "Combien de personnes ?"], ["B", "Four.", "Quatre."]], "r"],
    ["Seven, eight, nine, ten", "Sept, huit, neuf, dix", "SÈ-veun, ÈÏT, NAÏN, TÈN", "/ˈsɛvən eɪt naɪn tɛn/", "The store opens at nine.", "Le magasin ouvre à neuf heures.", "Eight se dit comme « ate » : « èït ».", "🔟", [["A", "What time?", "À quelle heure ?"], ["B", "At ten.", "À dix heures."]], null],
    ["Zero", "Zéro", "ZII-rôou", "/ˈzɪroʊ/", "Zero, six, one, two…", "Zéro, six, un, deux…", "Au téléphone, on dit souvent « oh » pour zéro.", "0️⃣", [["A", "Your number?", "Ton numéro ?"], ["B", "Zero, six…", "Zéro, six…"]], "r"],
    ["What's your phone number?", "Quel est votre numéro de téléphone ?", "OUATS yor FÔOUN NEUM-beur", "/wʌts jʊr foʊn ˈnʌmbər/", "What's your phone number, David?", "Quel est ton numéro, David ?", "Les numéros se disent chiffre par chiffre : six-one-two…", "📱", [["A", "What's your phone number?", "C'est quoi ton numéro ?"], ["B", "It's six, one, two…", "C'est six, un, deux…"]], "w"],
  ]),
  ...V(9, [
    ["How old are you?", "Quel âge avez-vous ?", "HAOU ÔOULD ar you", "/haʊ oʊld ɑr ju/", "How old are your kids?", "Quel âge ont tes enfants ?", "Littéralement « combien vieux es-tu ? ».", "🎂", [["A", "How old are you?", "Quel âge as-tu ?"], ["B", "I'm fifty-four.", "J'ai cinquante-quatre ans."]], "h"],
    ["I'm fifty-four", "J'ai cinquante-quatre ans", "aïm FIF-ti FOR", "/aɪm ˈfɪfti fɔr/", "I'm fifty-four years old.", "J'ai cinquante-quatre ans.", "En anglais on EST son âge : « I am 54 », jamais « I have 54 ».", "5️⃣", [["A", "How old are you?", "Quel âge as-tu ?"], ["B", "I'm fifty-four.", "J'ai cinquante-quatre ans."]], "stress"],
    ["Thirteen / thirty", "Treize / trente", "theur-TIIN / THEUR-di", "/θɜrˈtin/ /ˈθɜrdi/", "Thirteen dollars, not thirty!", "Treize dollars, pas trente !", "-TEEN : accent à la fin, long. -TY : accent au début, court.", "🔢", [["A", "Is it thirteen?", "C'est treize ?"], ["B", "No, thirty. Three-zero.", "Non, trente. Trois-zéro."]], "teen_ty"],
    ["Twenty", "Vingt", "TOUÈ-ni", "/ˈtwɛni/", "It's twenty dollars.", "C'est vingt dollars.", "Les Américains avalent souvent le T : « tweny ».", "💵", [["A", "How much?", "Combien ?"], ["B", "Twenty dollars.", "Vingt dollars."]], "flap_t"],
    ["One hundred", "Cent", "OUANN HEUN-dreud", "/wʌn ˈhʌndrəd/", "About one hundred people.", "Environ cent personnes.", "Hundred : H soufflé + « heun ».", "💯", [["A", "How many people?", "Combien de personnes ?"], ["B", "About one hundred.", "Environ cent."]], "h"],
  ]),
  ...V(10, [
    ["My family", "Ma famille", "maï FÈ-meu-li", "/maɪ ˈfæməli/", "This is my family.", "Voici ma famille.", "Accent sur FA. Le « i » du milieu disparaît presque.", "👨‍👩‍👧", [["A", "Is that your family?", "C'est ta famille ?"], ["B", "Yes, my family!", "Oui, ma famille !"]], "stress"],
    ["My wife / my husband", "Ma femme / mon mari", "maï OUAÏF / maï HEUZ-beund", "/waɪf/ /ˈhʌzbənd/", "My wife is French too.", "Ma femme est française aussi.", "Husband : « house » + « band » (le groupe qui tient la maison).", "💍", [["A", "Are you married?", "Tu es marié ?"], ["B", "Yes, this is my wife.", "Oui, voici ma femme."]], "h"],
    ["My kids", "Mes enfants (familier)", "maï KIDZ", "/kɪdz/", "My kids live in Paris.", "Mes enfants habitent à Paris.", "Kids = children, mais beaucoup plus courant à l'oral.", "🧒", [["A", "Do you have kids?", "Tu as des enfants ?"], ["B", "Yes, two kids.", "Oui, deux enfants."]], null],
    ["My son / my daughter", "Mon fils / ma fille", "maï SEUN / maï DO-deur", "/sʌn/ /ˈdɔtər/", "My daughter is twenty.", "Ma fille a vingt ans.", "Son se dit comme sun (soleil) : votre fils est votre soleil.", "👦", [["A", "Who is that?", "C'est qui ?"], ["B", "My son, Lucas.", "Mon fils, Lucas."]], "flap_t"],
    ["Brother and sister", "Frère et sœur", "BREU-THeur ènd SIS-teur", "/ˈbrʌðər ənd ˈsɪstər/", "I have one brother and one sister.", "J'ai un frère et une sœur.", "Le TH de brother est doux et vibrant, comme un « z » avec la langue entre les dents.", "👫", [["A", "Do you have brothers or sisters?", "Tu as des frères et sœurs ?"], ["B", "One brother.", "Un frère."]], "th_voiced"],
  ]),
  ...V(11, [
    ["Are you American?", "Êtes-vous américain ?", "ar you a-MÈ-ri-keun", "/ɑr ju əˈmɛrɪkən/", "Are you American or Canadian?", "Tu es américain ou canadien ?", "Accent sur MÈ : a-MÈ-ri-can.", "🇺🇸", [["A", "Are you American?", "Tu es américain ?"], ["B", "Yes, from Texas!", "Oui, du Texas !"]], "stress"],
    ["The United States", "Les États-Unis", "THeu you-NAÏ-did STÈÏTS", "/ðə juˈnaɪtɪd steɪts/", "I love the United States.", "J'adore les États-Unis.", "On dit aussi « the U.S. » (you-ÈS) ou « America ».", "🗽", [["A", "Your first time in the U.S.?", "Première fois aux USA ?"], ["B", "Yes, my first time!", "Oui, ma première fois !"]], "th_voiced"],
    ["Do you speak French?", "Parlez-vous français ?", "dou you SPIIK FRÈNTCH", "/du ju spik frɛntʃ/", "Excuse me, do you speak French?", "Excusez-moi, parlez-vous français ?", "Do sert à poser la question. Speak : « ii » long.", "🗣️", [["A", "Do you speak French?", "Tu parles français ?"], ["B", "No, sorry. Just English.", "Non, désolé. Juste anglais."]], "ee_i"],
    ["I speak a little English", "Je parle un peu anglais", "aï SPIIK a LI-deul ING-lich", "/aɪ spik ə ˈlɪtəl ˈɪŋɡlɪʃ/", "I speak a little English, but slowly.", "Je parle un peu anglais, mais lentement.", "Phrase magique : les gens s'adaptent à vous.", "💬", [["A", "Your English is great!", "Ton anglais est super !"], ["B", "Thanks, I speak a little English.", "Merci, je parle un peu anglais."]], "flap_t"],
    ["It's a beautiful country", "C'est un beau pays", "its a BIOU-di-feul KEUN-tri", "/ɪts ə ˈbjudəfəl ˈkʌntri/", "France is a beautiful country.", "La France est un beau pays.", "Beautiful : « biou-di-feul » avec le T américain doux.", "🏞️", [["A", "I love France!", "J'adore la France !"], ["B", "Yes, it's a beautiful country.", "Oui, c'est un beau pays."]], "flap_t"],
  ]),
  ...V(12, [
    ["What time is it?", "Quelle heure est-il ?", "ouat TAÏM iz it", "/wʌt taɪm ɪz ɪt/", "Excuse me, what time is it?", "Excusez-moi, quelle heure est-il ?", "« Time » = l'heure. « What time…? » = à quelle heure… ?", "🕒", [["A", "What time is it?", "Quelle heure est-il ?"], ["B", "It's three o'clock.", "Il est trois heures."]], "w"],
    ["Where is the restroom?", "Où sont les toilettes ?", "OUÈR iz THeu RÈST-roum", "/wɛr ɪz ðə ˈrɛstrum/", "Excuse me, where is the restroom?", "Excusez-moi, où sont les toilettes ?", "Aux USA, on dit « restroom » ou « bathroom », jamais « toilets ».", "🚻", [["A", "Where is the restroom?", "Où sont les toilettes ?"], ["B", "In the back, on the left.", "Au fond, à gauche."]], "w"],
    ["Who is that?", "Qui est-ce ?", "HOU iz THat", "/hu ɪz ðæt/", "Who is that man?", "Qui est cet homme ?", "Who se prononce « hou », le W est muet !", "🕵️", [["A", "Who is that?", "C'est qui ?"], ["B", "That's my friend, Sarah.", "C'est mon amie, Sarah."]], "th_voiced"],
    ["When does it open?", "Ça ouvre quand ?", "OUÈN deuz it ÔOU-peun", "/wɛn dʌz ɪt ˈoʊpən/", "When does the museum open?", "Quand ouvre le musée ?", "When = quand. Ne pas confondre avec where = où.", "🏛️", [["A", "When does it open?", "Ça ouvre quand ?"], ["B", "At nine a.m.", "À neuf heures du matin."]], "w"],
    ["How do you say… in English?", "Comment dit-on… en anglais ?", "HAOU dou you SÈÏ … in ING-lich", "/haʊ du ju seɪ … ɪn ˈɪŋɡlɪʃ/", "How do you say « pain » in English?", "Comment dit-on « pain » en anglais ?", "Votre joker : demandez sans crainte, les Américains adorent aider.", "🃏", [["A", "How do you say « baguette » in English?", "Comment dit-on « baguette » en anglais ?"], ["B", "We say « baguette » too!", "On dit « baguette » aussi !"]], "intonation"],
  ]),
  ...V(13, [
    ["What do you do?", "Que faites-vous dans la vie ?", "OUAT-deu-ya DOU", "/wʌt də jə du/", "So, what do you do, Manu?", "Alors, tu fais quoi dans la vie, Manu ?", "Question n°1 des Américains après le prénom ! Ils le disent « wadda-ya-dou ».", "💼", [["A", "What do you do?", "Tu fais quoi dans la vie ?"], ["B", "I work in sales.", "Je travaille dans la vente."]], "schwa"],
    ["I work in…", "Je travaille dans…", "aï OUEURK in", "/aɪ wɜrk ɪn/", "I work in a hospital.", "Je travaille dans un hôpital.", "Work (travail) ≠ walk (marcher). Work : « oueurk », avec le R.", "🏢", [["A", "Where do you work?", "Où travailles-tu ?"], ["B", "I work in an office.", "Je travaille dans un bureau."]], "r"],
    ["My job", "Mon travail", "maï DJAB", "/maɪ dʒɑb/", "I like my job.", "J'aime mon travail.", "Job = « djab », bouche ouverte.", "🧰", [["A", "Do you like your job?", "Tu aimes ton travail ?"], ["B", "Yes, I love my job.", "Oui, j'adore mon travail."]], null],
    ["Every day", "Tous les jours", "ÈV-ri DÈÏ", "/ˈɛvri deɪ/", "I practice English every day.", "Je pratique l'anglais tous les jours.", "Every = « èv-ri » (2 syllabes, pas 3).", "🔁", [["A", "Do you practice?", "Tu t'entraînes ?"], ["B", "Yes, every day!", "Oui, tous les jours !"]], "r"],
    ["On the weekend", "Le week-end", "on THeu OUII-kènd", "/ɑn ðə ˈwikɛnd/", "On the weekend, I play tennis.", "Le week-end, je joue au tennis.", "Les Américains disent « ON the weekend ».", "🎾", [["A", "What do you do on the weekend?", "Tu fais quoi le week-end ?"], ["B", "I relax with my family.", "Je me repose en famille."]], "th_voiced"],
  ]),
];

export const VOCAB_BY_ID = Object.fromEntries(VOCAB.map(v => [v.id, v]));

// ---------- Studio de prononciation : sons à travailler ----------
export const SOUNDS = {
  h: { name: "Le H soufflé", fr: "En français le H est muet. En anglais il se souffle, comme quand on embue des lunettes.", tip: "Mettez la main devant la bouche : vous devez sentir l'air sur « Hello ».", pairs: [["hi", "I"], ["hat", "at"], ["hair", "air"]], phrases: ["Hello, how are you?", "Have a nice day.", "Happy holidays!"] },
  th_unvoiced: { name: "Le TH soufflé (think)", fr: "Le bout de la langue se pose entre les dents, puis on souffle sans vibrer.", tip: "Regardez-vous dans un miroir : on doit voir le bout de la langue.", pairs: [["think", "sink"], ["three", "tree"], ["thank", "tank"]], phrases: ["Thank you very much.", "I think so.", "Three thousand things."] },
  th_voiced: { name: "Le TH vibrant (this)", fr: "Même position (langue entre les dents), mais la gorge vibre, comme un « z » doux.", tip: "Touchez votre gorge : elle doit vibrer sur « this », pas sur « think ».", pairs: [["this", "dis"], ["they", "day"], ["then", "den"]], phrases: ["This is my brother.", "The weather is nice.", "Is that your mother?"] },
  r: { name: "Le R américain", fr: "La langue recule et se recourbe légèrement, sans jamais toucher le palais. Pas de R roulé ni de R de gorge.", tip: "Dites « eu » puis reculez la langue : « eur ». Les lèvres s'arrondissent un peu.", pairs: [["right", "light"], ["read", "lead"], ["car", "caw"]], phrases: ["I'm from France.", "Are you ready?", "Good morning, Robert."] },
  ee_i: { name: "« ii » long ou « i » court", fr: "« Sheep » (mouton, ii long et souriant) ≠ « ship » (bateau, i court et relâché).", tip: "Long = souriez. Court = bouche détendue, presque « é ».", pairs: [["sheep", "ship"], ["leave", "live"], ["seat", "sit"]], phrases: ["Please sit down.", "I live here.", "Can I see it?"] },
  w: { name: "Le W", fr: "Les lèvres partent en rond, comme pour « ou », puis s'ouvrent : « ouat ».", tip: "Pas de V : les dents ne touchent jamais la lèvre.", pairs: [["west", "vest"], ["wine", "vine"], ["wet", "vet"]], phrases: ["What's your name?", "Where are you from?", "We want water."] },
  stress: { name: "L'accent tonique", fr: "En anglais, une syllabe est plus forte, plus longue, plus aiguë. Les autres sont avalées.", tip: "Tapez dans vos mains sur la syllabe forte : to-MOR-row, ba-NA-na, HO-tel.", pairs: [["PREsent (cadeau)", "preSENT (présenter)"], ["DEsert", "deSSERT"], ["REcord", "reCORD"]], phrases: ["My NAME is Manu.", "I'm on vaCAtion.", "See you toMORrow."] },
  intonation: { name: "L'intonation des questions", fr: "Question oui/non : la voix monte à la fin. Question avec what/where/how : la voix descend.", tip: "« Are you OK? ↗ »  « Where are you from? ↘ »", pairs: [["Coffee? ↗", "Coffee. ↘"], ["Ready? ↗", "Ready. ↘"]], phrases: ["Are you American?", "How are you?", "Do you like it?"] },
  flap_t: { name: "Le T américain (water → « wader »)", fr: "Entre deux voyelles, le T américain devient un D très léger et rapide.", tip: "Water → « oua-deur », better → « bè-deur », a little → « a li-deul ».", pairs: [["water", "wader"], ["better", "bedder"], ["city", "siddy"]], phrases: ["A little water, please.", "See you later.", "It's better."] },
  teen_ty: { name: "-TEEN ou -TY", fr: "Thirteen (13) : accent à la fin, long. Thirty (30) : accent au début, T doux.", tip: "En cas de doute, on dit « one-three » ou « three-zero ».", pairs: [["thirteen", "thirty"], ["fifteen", "fifty"], ["eighteen", "eighty"]], phrases: ["It's fifteen dollars.", "I'm fifty-four.", "Gate eighteen."] },
  linking: { name: "Les liaisons", fr: "Les Américains enchaînent les mots : « meet you » → « mii-tchou », « did you » → « di-djou ».", tip: "Ne coupez pas entre les mots : glissez de l'un à l'autre.", pairs: [["meet you", "mee-chu"], ["did you", "di-ju"], ["get it", "ge-dit"]], phrases: ["Nice to meet you.", "Did you eat?", "Can I get a coffee?"] },
  contractions: { name: "Les contractions", fr: "À l'oral, on contracte presque toujours : I am → I'm, do not → don't, it is → it's.", tip: "Dire « I am » à chaque fois sonne robotique. Dites « aïm ».", pairs: [["I am", "I'm"], ["do not", "don't"], ["it is", "it's"]], phrases: ["I'm fine.", "I don't know.", "It's OK."] },
  schwa: { name: "Les réductions (le « e » neutre)", fr: "Les petits mots non importants sont réduits : « to » → « teu », « and » → « n ». C'est le rythme américain.", tip: "What do you → « wadda-ya ». Going to → « gonna ».", pairs: [["going to", "gonna"], ["want to", "wanna"], ["what do you", "whaddaya"]], phrases: ["What do you do?", "I want to go.", "Rock and roll."] },
};

// Un focus de prononciation par semaine (utilisé quand un jour n'a pas de son précis)
export const WEEK_SOUND = ["h", "th_unvoiced", "ee_i", "flap_t", "r", "teen_ty", "linking", "contractions", "schwa", "stress", "intonation", "linking", "r", "th_voiced", "schwa", "stress"];

// ---------- Personnages ----------
export const CHARACTERS = {
  alex: { name: "Alex", role: "Professeur américain", emoji: "🧑‍🏫", gender: "m", pitch: 1.0, color: "#3d4a63", desc: "Patient, chaleureux, de Chicago. Il corrige avec douceur." },
  sarah: { name: "Sarah", role: "Amie américaine", emoji: "👩", gender: "f", pitch: 1.08, color: "#6b3d52", desc: "Enthousiaste, curieuse, de San Diego. Parle de tout." },
  michael: { name: "Michael", role: "Serveur au restaurant", emoji: "🧑‍🍳", gender: "m", pitch: 0.92, color: "#6e4a2c", desc: "Serveur souriant et rapide dans un diner de Boston." },
  jessica: { name: "Jessica", role: "Réceptionniste d'hôtel", emoji: "🛎️", gender: "f", pitch: 1.0, color: "#4b3f66", desc: "Professionnelle et aimable, hôtel à New York." },
  david: { name: "David", role: "Agent immobilier", emoji: "🏠", gender: "m", pitch: 0.85, color: "#2f5a4a", desc: "Énergique et commercial, à Miami." },
  emily: { name: "Emily", role: "Vendeuse", emoji: "🛍️", gender: "f", pitch: 1.15, color: "#2d5560", desc: "Vendeuse pétillante dans un magasin de vêtements." },
  james: { name: "James", role: "Passant dans la rue", emoji: "🚶", gender: "m", pitch: 1.05, color: "#4a4f59", desc: "Un New-Yorkais pressé mais serviable." },
};

// ---------- Mode « Je suis en Amérique » ----------
export const SITUATIONS = [
  { id: "airport", fr: "Aéroport", emoji: "✈️", character: "jessica", en: "At the airport check-in desk and passport control in New York (JFK)." },
  { id: "hotel", fr: "Hôtel", emoji: "🏨", character: "jessica", en: "Checking in at a hotel front desk in Manhattan." },
  { id: "restaurant", fr: "Restaurant", emoji: "🍔", character: "michael", en: "Ordering dinner at a diner in Boston; the waiter seats you, takes your order, brings the check." },
  { id: "cafe", fr: "Café", emoji: "☕", character: "sarah", en: "Ordering at a busy coffee shop counter (the barista asks size, name, for here or to go)." },
  { id: "supermarket", fr: "Supermarché", emoji: "🛒", character: "emily", en: "At a supermarket: finding products, asking an employee, paying at the checkout." },
  { id: "taxi", fr: "Taxi", emoji: "🚕", character: "james", en: "Taking a taxi in New York: giving the address, small talk, paying and tipping." },
  { id: "shop", fr: "Magasin", emoji: "👕", character: "emily", en: "In a clothing store: asking for a size, trying something on, paying." },
  { id: "street", fr: "Rue", emoji: "🗺️", character: "james", en: "Asking for directions in the street in New York." },
  { id: "party", fr: "Soirée entre amis", emoji: "🎉", character: "sarah", en: "At a friend's house party in San Diego: meeting people, small talk." },
  { id: "business", fr: "Rendez-vous professionnel", emoji: "💼", character: "david", en: "A business meeting: introductions, talking about work, scheduling a next meeting." },
  { id: "realestate", fr: "Agence immobilière", emoji: "🏠", character: "david", en: "Visiting an apartment for rent in Miami with a real estate agent." },
  { id: "phone", fr: "Conversation téléphonique", emoji: "📞", character: "jessica", en: "A phone call to book a table / an appointment; the line is not perfect, people speak fast." },
];

// ---------- Dialogues guidés (fonctionnent SANS IA : réponses pré-écrites, clairement indiqué) ----------
// Chaque étape : réplique du personnage, réponses acceptées (mots-clés), réponse suggérée.
export const GUIDED = {
  sarah_meet: {
    title: "Rencontrer Sarah", character: "sarah", minDay: 1,
    steps: [
      { en: "Hi! I'm Sarah. What's your name?", fr: "Salut ! Je suis Sarah. Comment tu t'appelles ?", keys: ["name", "i'm", "i am", "call"], sug: "Hi Sarah! My name is {name}.", sugFr: "Salut Sarah ! Je m'appelle {name}." },
      { en: "Nice to meet you! How are you today?", fr: "Enchantée ! Comment vas-tu aujourd'hui ?", keys: ["fine", "good", "great", "ok", "okay", "well", "thank"], sug: "I'm fine, thanks. And you?", sugFr: "Je vais bien, merci. Et toi ?" },
      { en: "I'm great, thanks! Where are you from?", fr: "Très bien, merci ! D'où viens-tu ?", keys: ["france", "french", "from", "paris", "lyon"], sug: "I'm from France.", sugFr: "Je viens de France." },
      { en: "Oh, France! I love France. Do you speak English?", fr: "Oh, la France ! J'adore la France. Tu parles anglais ?", keys: ["little", "yes", "learning", "bit", "speak"], sug: "A little. I'm learning English.", sugFr: "Un peu. J'apprends l'anglais." },
      { en: "Your English is good! Well, I have to go. See you later!", fr: "Ton anglais est bon ! Bon, je dois y aller. À plus tard !", keys: ["bye", "see you", "later", "take care", "nice day", "thank"], sug: "Thank you! See you later, Sarah!", sugFr: "Merci ! À plus tard, Sarah !" },
    ],
  },
  james_help: {
    title: "Demander de l'aide à James", character: "james", minDay: 3,
    steps: [
      { en: "Hey, are you OK? You look lost.", fr: "Hé, ça va ? Vous avez l'air perdu.", keys: ["excuse", "sorry", "yes", "help", "lost", "ok"], sug: "Excuse me. Yes, I'm a little lost.", sugFr: "Excusez-moi. Oui, je suis un peu perdu." },
      { en: "No problem. Where do you want to go?", fr: "Pas de problème. Où voulez-vous aller ?", keys: ["restroom", "bathroom", "museum", "hotel", "station", "where", "want", "go"], sug: "Where is the restroom, please?", sugFr: "Où sont les toilettes, s'il vous plaît ?" },
      { en: "The restroom? It's in the coffee shop, right over there, on the left.", fr: "Les toilettes ? C'est dans le café, juste là-bas, à gauche.", keys: ["understand", "repeat", "slow", "thank", "ok", "left"], sug: "Sorry, could you repeat that slowly, please?", sugFr: "Pardon, vous pouvez répéter lentement, s'il vous plaît ?" },
      { en: "Sure. The coffee shop… over there… on the left.", fr: "Bien sûr. Le café… là-bas… à gauche.", keys: ["thank", "thanks", "great", "ok"], sug: "Thank you very much!", sugFr: "Merci beaucoup !" },
      { en: "You're welcome. Have a nice day!", fr: "Je vous en prie. Bonne journée !", keys: ["you too", "too", "thank", "bye", "nice"], sug: "Thanks, you too!", sugFr: "Merci, vous aussi !" },
    ],
  },
  sarah_family: {
    title: "Parler de sa famille avec Sarah", character: "sarah", minDay: 8,
    steps: [
      { en: "So tell me, do you have a family?", fr: "Alors dis-moi, tu as une famille ?", keys: ["wife", "husband", "kids", "children", "son", "daughter", "yes", "no", "married", "family"], sug: "Yes, I have a wife and two kids.", sugFr: "Oui, j'ai une femme et deux enfants." },
      { en: "Aw, nice! How old are your kids?", fr: "Oh, sympa ! Quel âge ont tes enfants ?", keys: ["twenty", "thirty", "ten", "old", "years", "teen", "ty", "my son", "my daughter"], sug: "My son is twenty and my daughter is twenty-five.", sugFr: "Mon fils a vingt ans et ma fille vingt-cinq." },
      { en: "And you? How old are you, if I may ask?", fr: "Et toi ? Quel âge as-tu, si je peux me permettre ?", keys: ["fifty", "i'm", "old", "years", "forty", "sixty"], sug: "I'm fifty-four.", sugFr: "J'ai cinquante-quatre ans." },
      { en: "Cool! Do you have brothers or sisters?", fr: "Cool ! Tu as des frères ou des sœurs ?", keys: ["brother", "sister", "no", "yes", "one", "two"], sug: "I have one brother and one sister.", sugFr: "J'ai un frère et une sœur." },
      { en: "That's awesome. I have three brothers! Crazy, right?", fr: "Génial. Moi j'ai trois frères ! Fou, non ?", keys: ["wow", "crazy", "really", "three", "nice", "cool", "yes"], sug: "Wow, three brothers! That's a big family!", sugFr: "Waouh, trois frères ! C'est une grande famille !" },
    ],
  },
  michael_restaurant: {
    title: "Au restaurant avec Michael", character: "michael", minDay: 15,
    steps: [
      { en: "Hi! Welcome! How many people?", fr: "Bonjour ! Bienvenue ! Combien de personnes ?", keys: ["two", "one", "three", "four", "table", "just me", "people"], sug: "Hi! A table for two, please.", sugFr: "Bonjour ! Une table pour deux, s'il vous plaît." },
      { en: "Great, follow me. Here's the menu. Can I get you something to drink?", fr: "Parfait, suivez-moi. Voici la carte. Je vous sers quelque chose à boire ?", keys: ["water", "coffee", "coke", "beer", "wine", "juice", "like", "please"], sug: "I'd like some water, please.", sugFr: "Je voudrais de l'eau, s'il vous plaît." },
      { en: "Sure. Are you ready to order?", fr: "Bien sûr. Vous êtes prêts à commander ?", keys: ["burger", "salad", "steak", "chicken", "pasta", "like", "have", "minute", "yes", "no"], sug: "Yes, I'd like the burger, please.", sugFr: "Oui, je voudrais le burger, s'il vous plaît." },
      { en: "Good choice! Fries or salad with that?", fr: "Bon choix ! Frites ou salade avec ?", keys: ["fries", "salad", "please"], sug: "Fries, please.", sugFr: "Des frites, s'il vous plaît." },
      { en: "Here you go. Enjoy! … Can I get you anything else?", fr: "Voilà. Bon appétit ! … Je vous apporte autre chose ?", keys: ["check", "bill", "no", "thank", "that's all", "dessert"], sug: "No, thank you. Can I have the check, please?", sugFr: "Non merci. L'addition, s'il vous plaît ?" },
    ],
  },
  jessica_hotel: {
    title: "À l'hôtel avec Jessica", character: "jessica", minDay: 31,
    steps: [
      { en: "Good evening, welcome to the Park Hotel. Do you have a reservation?", fr: "Bonsoir, bienvenue au Park Hotel. Avez-vous une réservation ?", keys: ["yes", "reservation", "name", "booked", "have"], sug: "Yes, I have a reservation. My name is {name}.", sugFr: "Oui, j'ai une réservation. Je m'appelle {name}." },
      { en: "Perfect, I found it. Three nights, is that right?", fr: "Parfait, je l'ai trouvée. Trois nuits, c'est bien ça ?", keys: ["yes", "right", "correct", "three", "nights"], sug: "Yes, that's right.", sugFr: "Oui, c'est exact." },
      { en: "Can I see your passport and a credit card, please?", fr: "Puis-je voir votre passeport et une carte de crédit, s'il vous plaît ?", keys: ["here", "sure", "passport", "card", "yes"], sug: "Sure, here you go.", sugFr: "Bien sûr, voilà." },
      { en: "Thank you. You're in room 512. Breakfast is from 7 to 10. Any questions?", fr: "Merci. Vous êtes chambre 512. Le petit-déjeuner est de 7 h à 10 h. Des questions ?", keys: ["wifi", "password", "elevator", "breakfast", "where", "what time", "no", "thank"], sug: "What is the Wi-Fi password?", sugFr: "Quel est le mot de passe du Wi-Fi ?" },
      { en: "It's on your key card. Enjoy your stay!", fr: "Il est sur votre carte-clé. Bon séjour !", keys: ["thank", "thanks", "great", "bye"], sug: "Thank you very much. Have a nice evening!", sugFr: "Merci beaucoup. Bonne soirée !" },
    ],
  },
};

// ---------- Test de niveau initial (5 minutes) ----------
export const PLACEMENT = {
  listening: [
    { en: "Hello, how are you?", choices: ["Bonjour, comment ça va ?", "Bonjour, où es-tu ?", "Au revoir, à demain."], answer: 0 },
    { en: "What do you do for a living?", choices: ["Où habitez-vous ?", "Que faites-vous dans la vie ?", "Qu'avez-vous mangé ?"], answer: 1 },
    { en: "I'd like to book a table for two, please.", choices: ["Je voudrais acheter deux livres.", "Je voudrais une chambre pour deux nuits.", "Je voudrais réserver une table pour deux."], answer: 2 },
    { en: "I've been living here for about three years.", choices: ["J'habite ici depuis environ trois ans.", "Je vais vivre ici dans trois ans.", "J'ai visité trois fois cet endroit."], answer: 0 },
  ],
  speaking: ["Nice to meet you.", "I would like a coffee, please.", "I think it's a beautiful day."],
  self: [
    { id: "never", fr: "Je n'ai presque jamais fait d'anglais" },
    { id: "school", fr: "J'en ai fait à l'école, j'ai beaucoup oublié" },
    { id: "some", fr: "Je me débrouille un peu en voyage" },
  ],
};

// Repères CECRL (auto-évaluation indicative, aucune certification)
export const CEFR = {
  A1: ["Je peux me présenter et saluer.", "Je comprends des questions simples et lentes.", "Je peux commander à boire ou à manger.", "Je peux demander de répéter ou de parler lentement."],
  A2: ["Je peux parler de ma famille, de mon travail, de mes loisirs.", "Je me débrouille à l'hôtel, au restaurant, dans un magasin.", "Je peux raconter simplement ce que j'ai fait hier.", "Je comprends l'essentiel d'une conversation lente et claire."],
  B1: ["Je peux tenir une conversation sur des sujets courants.", "Je peux donner mon avis et l'expliquer simplement.", "Je me débrouille face à un imprévu en voyage.", "Je comprends des Américains qui parlent à vitesse normale sur des sujets familiers."],
};
