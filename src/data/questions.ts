import { Question } from '../types';

export const QUESTIONS: Question[] = [
  // SEÇÃO: DADOS PESSOAIS
  {
    id: 'idade',
    section: 'pessoal',
    text: 'Qual sua faixa etária?',
    type: 'select',
    options: [
      { label: 'Menos de 18 anos', value: 'u18', points: 5 },
      { label: '18 a 25 anos', value: '18-25', points: 3 },
      { label: '26 a 40 anos', value: '26-40', points: 5 },
      { label: '41 a 60 anos', value: '41-60', points: 7 },
      { label: 'Mais de 60 anos', value: 'o60', points: 8 },
    ]
  },
  {
    id: 'estado_civil',
    section: 'pessoal',
    text: 'Qual seu estado civil?',
    type: 'select',
    options: [
      { label: 'Solteiro(a)', value: 'solteiro', points: 3 },
      { label: 'Casado(a) / União Estável', value: 'casado', points: 8 },
      { label: 'Divorciado(a)', value: 'divorciado', points: 4 },
      { label: 'Viúvo(a)', value: 'viuvo', points: 5 },
    ]
  },
  {
    id: 'filhos',
    section: 'pessoal',
    text: 'Você tem filhos?',
    type: 'select',
    options: [
      { label: 'Sim, moram no Brasil', value: 'sim_brasil', points: 8 },
      { label: 'Sim, moram no exterior', value: 'sim_exterior', points: 2 },
      { label: 'Não tenho filhos', value: 'nao', points: 4 },
    ]
  },
  {
    id: 'escolaridade',
    section: 'pessoal',
    text: 'Qual seu nível de escolaridade?',
    type: 'select',
    options: [
      { label: 'Ensino Médio', value: 'medio', points: 3 },
      { label: 'Ensino Superior Incompleto', value: 'superior_inc', points: 4 },
      { label: 'Ensino Superior Completo', value: 'superior_comp', points: 7 },
      { label: 'Pós-graduação / Mestrado / Doutorado', value: 'pos', points: 9 },
    ]
  },

  // SEÇÃO: TRABALHO E RENDA
  {
    id: 'situacao_prof',
    section: 'trabalho',
    text: 'Qual sua situação profissional atual?',
    type: 'select',
    options: [
      { label: 'CLT (Carteira Assinada)', value: 'clt', points: 10 },
      { label: 'Funcionário Público', value: 'publico', points: 12 },
      { label: 'Empresário / Sócio de Empresa', value: 'empresario', points: 10 },
      { label: 'Autônomo (com comprovação)', value: 'autonomo_formal', points: 7 },
      { label: 'Autônomo (sem comprovação)', value: 'autonomo_informal', points: 2 },
      { label: 'Aposentado / Pensionista', value: 'aposentado', points: 9 },
      { label: 'Estudante', value: 'estudante', points: 6 },
      { label: 'Desempregado', value: 'desempregado', points: 0 },
    ]
  },
  {
    id: 'tempo_trabalho',
    section: 'trabalho',
    text: 'Há quanto tempo está na ocupação atual?',
    type: 'select',
    options: [
      { label: 'Menos de 6 meses', value: 'u6m', points: 1 },
      { label: '6 meses a 1 ano', value: '6m-1y', points: 3 },
      { label: '1 a 3 anos', value: '1-3y', points: 6 },
      { label: '3 a 5 anos', value: '3-5y', points: 8 },
      { label: 'Mais de 5 anos', value: 'o5y', points: 10 },
    ]
  },
  {
    id: 'renda_mensal',
    section: 'trabalho',
    text: 'Qual sua renda mensal aproximada?',
    type: 'select',
    options: [
      { label: 'Até R$ 2.000', value: 'u2k', points: 1 },
      { label: 'R$ 2.000 a R$ 5.000', value: '2-5k', points: 4 },
      { label: 'R$ 5.000 a R$ 10.000', value: '5-10k', points: 8 },
      { label: 'R$ 10.000 a R$ 20.000', value: '10-20k', points: 10 },
      { label: 'Acima de R$ 20.000', value: 'o20k', points: 12 },
    ]
  },
  {
    id: 'irpf',
    section: 'trabalho',
    text: 'Você declara Imposto de Renda?',
    type: 'select',
    options: [
      { label: 'Sim, declaro e tenho ativos', value: 'sim_ativos', points: 8 },
      { label: 'Sim, mas sou isento de pagar', value: 'sim_isento', points: 5 },
      { label: 'Não declaro', value: 'nao', points: 1 },
    ]
  },

  // SEÇÃO: DETALHES DA VIAGEM
  {
    id: 'objetivo',
    section: 'viagem',
    text: 'Qual o objetivo principal da viagem?',
    type: 'select',
    options: [
      { label: 'Turismo / Férias', value: 'turismo', points: 8 },
      { label: 'Compras', value: 'compras', points: 7 },
      { label: 'Negócios / Congressos', value: 'negocios', points: 9 },
      { label: 'Tratamento Médico', value: 'medico', points: 5 },
      { label: 'Visitar Familiares / Amigos', value: 'visita', points: 6 },
    ]
  },
  {
    id: 'duracao',
    section: 'viagem',
    text: 'Quanto tempo pretende ficar nos EUA?',
    type: 'select',
    options: [
      { label: 'Até 10 dias', value: 'u10d', points: 8 },
      { label: '10 a 20 dias', value: '10-20d', points: 7 },
      { label: '21 a 30 dias', value: '21-30d', points: 5 },
      { label: 'Mais de 30 dias', value: 'o30d', points: 2 },
    ]
  },
  {
    id: 'quem_paga',
    section: 'viagem',
    text: 'Quem pagará os custos da viagem?',
    type: 'select',
    options: [
      { label: 'Eu mesmo', value: 'proprio', points: 10 },
      { label: 'Empresa onde trabalho', value: 'empresa', points: 12 },
      { label: 'Pai / Mãe / Cônjuge', value: 'familia', points: 7 },
      { label: 'Amigo / Outro parente', value: 'outros', points: 3 },
    ]
  },
  {
    id: 'acompanhante',
    section: 'viagem',
    text: 'Com quem você pretende viajar?',
    type: 'select',
    options: [
      { label: 'Sozinho(a)', value: 'sozinho', points: 5 },
      { label: 'Cônjuge / Parceiro(a)', value: 'conjuge', points: 8 },
      { label: 'Família Completa (pais e filhos)', value: 'familia', points: 10 },
      { label: 'Amigos / Grupo de Turistico', value: 'grupo', points: 7 },
    ]
  },

  // SEÇÃO: CONTATO NOS EUA
  {
    id: 'parentes_eua',
    section: 'contato',
    text: 'Você possui parentes próximos nos EUA?',
    type: 'select',
    options: [
      { label: 'Não possuo parentes nos EUA', value: 'nao', points: 10 },
      { label: 'Sim, cidadão americano ou residente legal', value: 'sim_legal', points: 5 },
      { label: 'Sim, com visto de estudante/trabalho', value: 'sim_visto', points: 4 },
      { label: 'Sim, em situação irregular', value: 'sim_irregular', points: -10 },
    ]
  },
  {
    id: 'conhecidos_eua',
    section: 'contato',
    text: 'Conhece alguém (não parente) nos EUA?',
    type: 'select',
    options: [
      { label: 'Sim, vou visitar essa pessoa', value: 'sim_visita', points: 5 },
      { label: 'Sim, mas não vou visitá-la', value: 'sim_nao_visita', points: 7 },
      { label: 'Não conheço ninguém', value: 'nao', points: 8 },
    ]
  },

  // SEÇÃO: HISTÓRICO INTERNACIONAL
  {
    id: 'viagens_anteriores',
    section: 'historico_intl',
    text: 'Já viajou para fora do Brasil anteriormente?',
    type: 'select',
    options: [
      { label: 'Nunca saí do país', value: 'nunca', points: 0 },
      { label: 'Sim, para países vizinhos (América do Sul)', value: 'latam', points: 4 },
      { label: 'Sim, para Europa / Japão / Canadá / Oceania', value: 'oecd', points: 10 },
      { label: 'Sim, já estive nos EUA anteriormente', value: 'eua', points: 12 },
    ]
  },
  {
    id: 'quantas_viagens',
    section: 'historico_intl',
    text: 'Quantas viagens internacionais fez nos últimos 5 anos?',
    type: 'select',
    options: [
      { label: 'Nenhuma', value: '0', points: 0 },
      { label: '1 a 2 viagens', value: '1-2', points: 5 },
      { label: '3 ou mais viagens', value: '3+', points: 10 },
    ]
  },

  // SEÇÃO: HISTÓRICO CONSULAR
  {
    id: 'visto_negado',
    section: 'historico_consular',
    text: 'Já teve algum visto americano negado?',
    type: 'select',
    options: [
      { label: 'Nunca tive negativa', value: 'nao', points: 10 },
      { label: 'Sim, uma vez', value: 'sim_1', points: -15 },
      { label: 'Sim, mais de uma vez', value: 'sim_plus', points: -25 },
    ]
  },
  {
    id: 'visto_cancelado',
    section: 'historico_consular',
    text: 'Já teve algum visto cancelado ou revogado?',
    type: 'select',
    options: [
      { label: 'Não', value: 'nao', points: 5 },
      { label: 'Sim', value: 'sim', points: -30 },
    ]
  },
  {
    id: 'problemas_imigracao',
    section: 'historico_consular',
    text: 'Já teve problemas com imigração em qualquer país?',
    type: 'select',
    options: [
      { label: 'Não', value: 'nao', points: 5 },
      { label: 'Sim', value: 'sim', points: -40 },
    ]
  },

  // SEÇÃO: VÍNCULOS NO BRASIL
  {
    id: 'imovel',
    section: 'vinculos',
    text: 'Possui imóvel próprio em seu nome?',
    type: 'select',
    options: [
      { label: 'Sim, quitado', value: 'sim_f', points: 8 },
      { label: 'Sim, por financiamento', value: 'sim_p', points: 6 },
      { label: 'Não possuo', value: 'nao', points: 2 },
    ]
  },
  {
    id: 'veiculo',
    section: 'vinculos',
    text: 'Possui veículo próprio?',
    type: 'select',
    options: [
      { label: 'Sim', value: 'sim', points: 5 },
      { label: 'Não', value: 'nao', points: 2 },
    ]
  },
  {
    id: 'estudante_matriculado',
    section: 'vinculos',
    text: 'Está matriculado em curso de graduação ou pós?',
    type: 'select',
    options: [
      { label: 'Sim', value: 'sim', points: 7 },
      { label: 'Não', value: 'nao', points: 2 },
    ]
  },
  {
    id: 'parentes_dependentes',
    section: 'vinculos',
    text: 'Possui dependentes financeiros no Brasil?',
    type: 'select',
    options: [
      { label: 'Sim (filhos, pais, etc)', value: 'sim', points: 6 },
      { label: 'Não', value: 'nao', points: 3 },
    ]
  },

  // SEÇÃO: CONSISTÊNCIA
  {
    id: 'roteiro',
    section: 'consistencia',
    text: 'Você já tem um roteiro definido das cidades que visitará?',
    type: 'select',
    options: [
      { label: 'Sim, detalhado', value: 'detalhado', points: 6 },
      { label: 'Apenas uma ideia geral', value: 'geral', points: 3 },
      { label: 'Ainda não pensei nisso', value: 'nada', points: 0 },
    ]
  },
  {
    id: 'ingles',
    section: 'consistencia',
    text: 'Qual seu nível de inglês?',
    type: 'select',
    options: [
      { label: 'Fluente / Avançado', value: 'fluente', points: 6 },
      { label: 'Intermediário', value: 'inter', points: 5 },
      { label: 'Básico / Não falo', value: 'basico', points: 4 },
    ]
  },
  {
    id: 'explicar_trabalho',
    section: 'consistencia',
    text: 'Você consegue explicar facilmente sua função no trabalho?',
    type: 'select',
    options: [
      { label: 'Sim, perfeitamente', value: 'sim', points: 6 },
      { label: 'Tenho alguma dificuldade', value: 'medio', points: 2 },
      { label: 'Não saberia explicar bem', value: 'nao', points: 0 },
    ]
  },
  {
    id: 'outros_vistos',
    section: 'historico_intl',
    text: 'Possui vistos válidos para outros países (Canadá, UK, etc)?',
    type: 'select',
    options: [
      { label: 'Sim, mais de um', value: 'sim_multi', points: 10 },
      { label: 'Sim, um', value: 'sim_um', points: 6 },
      { label: 'Não possuo outros vistos', value: 'nao', points: 2 },
    ]
  },
  {
    id: 'poupanca',
    section: 'trabalho',
    text: 'Possui reservas financeiras líquidas (investimentos/poupança)?',
    type: 'select',
    options: [
      { label: 'Sim, valor expressivo', value: 'alto', points: 8 },
      { label: 'Sim, valores moderados', value: 'medio', points: 5 },
      { label: 'Pouca ou nenhuma reserva', value: 'baixo', points: 1 },
    ]
  },
  {
    id: 'periodo_viagem',
    section: 'viagem',
    text: 'A viagem será durante suas férias documentadas?',
    type: 'select',
    options: [
      { label: 'Sim, férias aprovadas', value: 'sim', points: 7 },
      { label: 'Não, folga ou feriado', value: 'nao', points: 3 },
      { label: 'Trabalho remotamente', value: 'remoto', points: 5 },
    ]
  },
  {
    id: 'moradia_tempo',
    section: 'vinculos',
    text: 'Há quanto tempo mora no mesmo endereço?',
    type: 'select',
    options: [
      { label: 'Menos de 1 ano', value: 'u1', points: 2 },
      { label: '1 a 5 anos', value: '1-5', points: 5 },
      { label: 'Mais de 5 anos', value: 'o5', points: 8 },
    ]
  },
  {
    id: 'familia_no_brasil',
    section: 'vinculos',
    text: 'Seus pais e irmãos moram no Brasil?',
    type: 'select',
    options: [
      { label: 'Sim, todos', value: 'todos', points: 8 },
      { label: 'A maioria', value: 'maioria', points: 5 },
      { label: 'Metade ou menos', value: 'minoria', points: 2 },
    ]
  },
  {
    id: 'redes_sociais',
    section: 'consistencia',
    text: 'Suas redes sociais refletem sua atividade profissional?',
    type: 'select',
    options: [
      { label: 'Sim, totalmente condizente', value: 'sim', points: 5 },
      { label: 'Não utilizo muito', value: 'pouco', points: 4 },
      { label: 'Pode haver contradições', value: 'conflito', points: -5 },
    ]
  },
  {
    id: 'ja_teve_visto',
    section: 'historico_consular',
    text: 'Já teve visto americano antes?',
    type: 'select',
    options: [
      { label: 'Sim, e expirou bem', value: 'vencido', points: 12 },
      { label: 'Nunca tive', value: 'nunca', points: 5 },
      { label: 'Tive e foi extraviado/roubado', value: 'problema', points: 0 },
    ]
  },
  {
    id: 'destino_risco',
    section: 'viagem',
    text: 'Qual seu destino principal?',
    type: 'select',
    options: [
      { label: 'Cidades turísticas (Orlando, Miami, NY)', value: 'turismo', points: 8 },
      { label: 'Cidades com pouca tradição turística', value: 'baixa', points: 4 },
      { label: 'Lugares com alta concentração de brasileiros irregulares', value: 'risco', points: 1 },
    ]
  },
  {
    id: 'formacao_area',
    section: 'trabalho',
    text: 'Sua formação acadêmica é condizente com seu trabalho?',
    type: 'select',
    options: [
      { label: 'Sim, atuo na área de formação', value: 'sim', points: 7 },
      { label: 'Atuo em área diferente', value: 'dif', points: 4 },
      { label: 'Não possuo curso superior', value: 'nao', points: 3 },
    ]
  },
  {
    id: 'declaracao_ir_valor',
    section: 'trabalho',
    text: 'O valor declarado no IR é compatível com sua renda informada?',
    type: 'select',
    options: [
      { label: 'Sim, exatamente', value: 'sim', points: 7 },
      { label: 'Há pequenas diferenças', value: 'dif', points: 3 },
      { label: 'Não é compatível', value: 'nao', points: -10 },
    ]
  },
  {
    id: 'hospedagem',
    section: 'viagem',
    text: 'Onde você pretende se hospedar?',
    type: 'select',
    options: [
      { label: 'Hotel / Airbnb', value: 'hotel', points: 8 },
      { label: 'Casa de Amigos / Parentes', value: 'casa', points: 5 },
      { label: 'Não defini ainda', value: 'nao', points: 1 },
    ]
  }
];
