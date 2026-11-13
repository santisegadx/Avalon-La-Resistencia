import { Alignment, Role } from '../../../shared/types';

export interface RoleMetadata {
  name: string;
  alignment: Alignment;
  shortDesc: string;
}

export const ROLE_METADATA: Record<Role, RoleMetadata> = {
  MERLIN: {
    name: 'Merlín',
    alignment: 'GOOD',
    shortDesc: 'Conoces a los agentes del Mal (excepto a Mordred). Guía al Bien sin ser descubierto.',
  },
  PERCEVAL: {
    name: 'Perceval',
    alignment: 'GOOD',
    shortDesc: 'Ves a Merlín y a Morgana con la misma marca arcana. Protege al verdadero Merlín.',
  },
  LOYAL_SERVANT: {
    name: 'Leal Paladín de Arturo',
    alignment: 'GOOD',
    shortDesc: 'Sirves a Camelot con honor. Deduce quiénes mienten mediante los votos.',
  },
  ASSASSIN: {
    name: 'El Asesino',
    alignment: 'EVIL',
    shortDesc: 'Si el Bien logra 3 gestas, tendrás un disparo final para eliminar a Merlín.',
  },
  MORGANA: {
    name: 'Morgana',
    alignment: 'EVIL',
    shortDesc: 'Apareces como posible Merlín ante Perceval para sembrar confusión.',
  },
  MORDRED: {
    name: 'Mordred',
    alignment: 'EVIL',
    shortDesc: 'Permaneces oculto a la vista de Merlín. Infiltración absoluta.',
  },
  OBERON: {
    name: 'Oberón',
    alignment: 'EVIL',
    shortDesc: 'Actúas solo: no conoces a tus aliados del Mal ni ellos te conocen a ti.',
  },
  MINION: {
    name: 'Esbirro de Mordred',
    alignment: 'EVIL',
    shortDesc: 'Sabotea las gestas de Arturo junto a tus aliados del Mal.',
  },
};