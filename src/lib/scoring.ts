import { SimulationResult, Question } from '../types';
import { QUESTIONS } from '../data/questions';

export function calculateResult(responses: Record<string, string>): SimulationResult {
  let totalPoints = 0;
  let maxPossiblePoints = 0;

  const positives: string[] = [];
  const negatives: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  QUESTIONS.forEach(q => {
    const selectedValue = responses[q.id];
    const selectedOption = q.options?.find(o => o.value === selectedValue);
    
    // Find max points for this question for normalization
    const maxQPoints = Math.max(...(q.options?.map(o => o.points) || [0]));
    maxPossiblePoints += Math.max(0, maxQPoints);

    if (selectedOption) {
      totalPoints += selectedOption.points;

      // Logic for adding notes
      if (selectedOption.points >= 8) {
        if (q.section === 'trabalho') positives.push(`Estabilidade profissional: ${selectedOption.label}`);
        if (q.section === 'vinculos') positives.push(`Vínculo forte no Brasil: ${selectedOption.label}`);
        if (q.section === 'historico_intl') positives.push(`Bom histórico de viagens: ${selectedOption.label}`);
      }

      if (selectedOption.points <= 2 && selectedOption.points >= 0) {
        if (q.section === 'trabalho') negatives.push(`Baixa comprovação de renda ou estabilidade`);
        if (q.section === 'vinculos') negatives.push(`Poucos bens ou vínculos no Brasil`);
      }

      if (selectedOption.points < 0) {
        risks.push(`Fator crítico detectado: ${q.text} (${selectedOption.label})`);
      }
    }
  });

  // Specific risk combinations
  if (responses['situacao_prof'] === 'desempregado' && (responses['duracao'] === '21-30d' || responses['duracao'] === 'o30d')) {
    risks.push('Risco alto: Desempregado com intenção de longa permanência');
    totalPoints -= 15;
  }

  if (responses['parentes_eua'] === 'sim_irregular') {
    risks.push('Risco crítico: Parentes irregulares nos EUA são forte motivo de negativa');
    recommendations.push('Regularize sua situação ou esteja preparado para provar que não tem contato com esses parentes');
  }

  // Prepara as recomendações bases
  if (responses['renda_mensal'] === 'u2k') {
    recommendations.push('Aumente sua reserva financeira ou busque um patrocinador (sponsor) com vínculo forte');
  }
  
  if (responses['viagens_anteriores'] === 'nunca') {
    recommendations.push('Considere viajar para outros países antes de tentar o visto americano para construir histórico');
  }

  recommendations.push('Revise atentamente o formulário DS-160 para garantir consistência total');
  recommendations.push('Tenha em mãos todos os documentos que comprovam o que foi dito no formulário');

  // Normalize score to 0-100
  // Note: some negatives can make it lower than 0
  let normalizedScore = Math.round((totalPoints / maxPossiblePoints) * 100);
  normalizedScore = Math.max(0, Math.min(100, normalizedScore));

  let classification: SimulationResult['classification'] = 'Médio';
  if (normalizedScore >= 70) classification = 'Forte';
  else if (normalizedScore < 40) classification = 'Arriscado';

  // Fallback for empty lists
  if (positives.length === 0) positives.push('Seu perfil possui características equilibradas');
  if (negatives.length === 0 && risks.length === 0) positives.push('Nenhum ponto negativo crítico detectado');

  return {
    score: normalizedScore,
    classification,
    positives: Array.from(new Set(positives)).slice(0, 5),
    negatives: Array.from(new Set(negatives)).slice(0, 3),
    risks: Array.from(new Set(risks)).slice(0, 3),
    recommendations: Array.from(new Set(recommendations)).slice(0, 5),
  };
}
