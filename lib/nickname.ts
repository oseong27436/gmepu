const ADJECTIVES = [
  "졸린", "배고픈", "신나는", "수줍은", "용감한", "엉뚱한",
  "귀여운", "느긋한", "바쁜", "행복한", "고요한", "씩씩한",
  "반짝이는", "따뜻한", "시원한", "달콤한", "새콤한", "포근한",
];

const NOUNS = [
  "고양이", "펭귄", "곰돌이", "토끼", "여우", "다람쥐",
  "부엉이", "햄스터", "강아지", "오리", "고래", "돌고래",
  "참새", "두더지", "너구리", "미어캣", "카피바라", "알파카",
];

export function generateNickname(seed?: string): string {
  const hash = seed
    ? seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : Math.floor(Math.random() * 9999);
  const adj = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  return `${adj} ${noun}`;
}

// 캐릭터 아이콘 이모지 (닉네임 기반)
const CHARACTERS = ["🐱","🐧","🐻","🐰","🦊","🐿️","🦉","🐹","🐶","🦆","🐳","🐬","🐦","🦔","🦝","🦫","🦙"];

export function getNicknameEmoji(nickname: string): string {
  const hash = nickname.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CHARACTERS[hash % CHARACTERS.length];
}
