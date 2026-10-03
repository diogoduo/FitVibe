// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_inicial.sql';
import m0001 from './0001_plano_e_exercicios.sql';
import m0002 from './0002_treinos_feitos.sql';
import m0003 from './0003_dieta.sql';
import m0004 from './0004_unidade_ml.sql';
import m0005 from './0005_observacoes_do_plano.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  