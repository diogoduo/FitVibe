-- RIR 0 deixa de ser "falha": a falha passa a ser -1 e o 0 vira "RIR 0" (nenhuma na reserva, sem
-- tentar a que falharia). Até aqui todo RIR 0 gravado era falha. O updated_at sobe para a mudança
-- entrar na fila e ir para a conta (a última alteração vence).
UPDATE `workout_sets`
SET `rir` = -1,
  `updated_at` = max(`updated_at` + 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
WHERE `rir` = 0;
