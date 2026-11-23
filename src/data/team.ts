/**
 * Active lab members, shown on the "Sobre nós" page in this order.
 * Put photos in public/team/ (square, ~400×400 px) and set `photo` to the file
 * name, e.g. 'maria-silva.jpg'. Without a photo, initials are shown instead.
 */
export interface Member {
  name: string;
  role: string;
  photo?: string;
  link?: string;
}

// PLACEHOLDERS: replace with the real team.
export const team: Member[] = [
  { name: 'Nome Sobrenome', role: 'Coordenação' },
  { name: 'Nome Sobrenome', role: 'Pesquisador(a)' },
  { name: 'Nome Sobrenome', role: 'Pesquisador(a)' },
  { name: 'Nome Sobrenome', role: 'Doutorando(a)' },
  { name: 'Nome Sobrenome', role: 'Mestrando(a)' },
  { name: 'Nome Sobrenome', role: 'Iniciação científica' },
];
