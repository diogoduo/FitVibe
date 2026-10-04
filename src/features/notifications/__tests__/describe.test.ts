import { contract, mealPhrase, notificationRoute, notificationText } from '../describe';

describe('texto das notificações', () => {
  it('postou: a refeição com o artigo certo, o treino, as metas, o dia e a foto', () => {
    const post = (data: object) => notificationText({ kind: 'post', data });
    expect(post({ post_kind: 'meal', meal_name: 'Café da manhã' })).toBe('postou o café da manhã.');
    expect(post({ post_kind: 'meal', meal_name: 'Ceia' })).toBe('postou a ceia.');
    expect(post({ post_kind: 'meal', meal_name: 'Marmita' })).toBe('postou a refeição "Marmita".');
    expect(post({ post_kind: 'workout', workout_name: 'Pernas' })).toBe('postou o treino Pernas.');
    expect(post({ post_kind: 'goals' })).toBe('postou as metas.');
    expect(post({ post_kind: 'day' })).toBe('postou o resumo do dia.');
    expect(post({ post_kind: 'photo', has_photo: true })).toBe('postou uma foto.');
  });

  it('curtiu e comentou: "sua foto" com foto, senão o post do que foi postado', () => {
    expect(notificationText({ kind: 'like', data: { post_kind: 'meal', has_photo: true } })).toBe(
      'curtiu sua foto.',
    );
    expect(
      notificationText({ kind: 'like', data: { post_kind: 'meal', meal_name: 'Almoço' } }),
    ).toBe('curtiu seu post do almoço.');
    expect(notificationText({ kind: 'like', data: { post_kind: 'goals' } })).toBe(
      'curtiu seu post das metas.',
    );
    expect(
      notificationText({
        kind: 'comment',
        data: { post_kind: 'photo', has_photo: true, comment: 'Boa!' },
      }),
    ).toBe('comentou na sua foto: "Boa!"');
    expect(
      notificationText({
        kind: 'comment',
        data: { post_kind: 'workout', workout_name: 'Costas', comment: 'Monstro' },
      }),
    ).toBe('comentou no seu post do treino Costas: "Monstro"');
  });

  it('seguir', () => {
    expect(notificationText({ kind: 'follow', data: {} })).toBe('começou a seguir você.');
    expect(notificationText({ kind: 'follow_request', data: {} })).toBe('pediu para seguir você.');
    expect(notificationText({ kind: 'follow_accepted', data: {} })).toBe(
      'aceitou seu pedido para seguir.',
    );
  });

  it('contrações e refeição sem nome', () => {
    expect(contract('de', 'o almoço')).toBe('do almoço');
    expect(contract('em', 'a sua foto')).toBe('na sua foto');
    expect(contract('de', 'uma foto')).toBe('de uma foto');
    expect(mealPhrase(undefined)).toBe('uma refeição');
  });

  it('para onde leva', () => {
    const base = { username: 'anasouza', post_id: 'p1' };
    expect(notificationRoute({ ...base, kind: 'comment' })).toEqual({
      pathname: '/post/[id]',
      params: { id: 'p1' },
    });
    expect(notificationRoute({ ...base, kind: 'follow' })).toEqual({
      pathname: '/u/[username]',
      params: { username: 'anasouza' },
    });
    // Post apagado: vai para o perfil.
    expect(notificationRoute({ ...base, post_id: null, kind: 'like' }).pathname).toBe(
      '/u/[username]',
    );
  });
});
