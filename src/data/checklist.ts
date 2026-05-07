export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistCategory {
  id: string;
  title: string;
  icon?: string;
  items: ChecklistItem[];
}

export const CHECKLIST_DATA: ChecklistCategory[] = [
  {
    id: 'dados_pessoais',
    title: '📌 DADOS PESSOAIS',
    items: [
      { id: 'dp1', text: 'Nome igual ao passaporte' },
      { id: 'dp2', text: 'Data de nascimento correta' },
      { id: 'dp3', text: 'Número do passaporte correto' },
      { id: 'dp4', text: 'Nacionalidade correta' },
    ]
  },
  {
    id: 'info_viagem',
    title: '✈️ INFORMAÇÕES DE VIAGEM',
    items: [
      { id: 'iv1', text: 'Motivo da viagem claro' },
      { id: 'iv2', text: 'Tempo de permanência coerente' },
      { id: 'iv3', text: 'Datas consistentes' },
      { id: 'iv4', text: 'Plano de viagem simples' },
    ]
  },
  {
    id: 'trabalho_renda',
    title: '💼 TRABALHO E RENDA',
    items: [
      { id: 'tr1', text: 'Ocupação atual correta' },
      { id: 'tr2', text: 'Nome da empresa correto' },
      { id: 'tr3', text: 'Renda coerente com o perfil' },
      { id: 'tr4', text: 'Informações profissionais claras' },
    ]
  },
  {
    id: 'historico_viagem',
    title: '🌎 HISTÓRICO DE VIAGENS',
    items: [
      { id: 'hv1', text: 'Viagens internacionais informadas' },
      { id: 'hv2', text: 'Nenhuma informação omitida' },
      { id: 'hv3', text: 'Histórico consistente' },
    ]
  },
  {
    id: 'contato_eua',
    title: '🇺🇸 CONTATO NOS EUA',
    items: [
      { id: 'ce1', text: 'Nome do contato correto' },
      { id: 'ce2', text: 'Endereço correto' },
      { id: 'ce3', text: 'Coerente com a viagem' },
    ]
  },
  {
    id: 'consistencia',
    title: '🔎 CONSISTÊNCIA GERAL',
    items: [
      { id: 'cg1', text: 'Todas as informações fazem sentido juntas' },
      { id: 'cg2', text: 'Sem contradições' },
      { id: 'cg3', text: 'Respostas claras e objetivas' },
    ]
  },
  {
    id: 'revisao',
    title: '✅ REVISÃO FINAL',
    items: [
      { id: 'rf1', text: 'Revisei todo o formulário' },
      { id: 'rf2', text: 'Corrigi erros de digitação' },
      { id: 'rf3', text: 'Estou seguro com as informações' },
    ]
  }
];
