// frontend/src/App.js
// Главный компонент приложения "Опрос по Ведьмаку"
// Реализует: просмотр опросов (гость), вход/регистрация, однократное голосование, отображение статистики

import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // Подключаем стили Bootstrap
import './App.css'; // Подключаем кастомные стили (тема Ведьмака)

function App() {
  // Состояния
  const [auth, setAuth] = useState(null); // { token, username } — данные авторизованного пользователя
  const [polls, setPolls] = useState([]); // Список опросов, загруженных с бэкенда
  const [selections, setSelections] = useState({}); // Текущий выбор пользователя: { questionId: choiceId }
  const [hasVoted, setHasVoted] = useState(false); // Флаг: проголосовал ли пользователь
  const [showAuthModal, setShowAuthModal] = useState(false); // Показывать/скрыть модальное окно входа
  const [authTab, setAuthTab] = useState('login'); // Активная вкладка в модальном окне: 'login' или 'register'

  // Загрузка данных при первом рендере компонента
  useEffect(() => {
    const saved = localStorage.getItem('auth');
    if (saved) {
      // Восстанавливаем сессию из localStorage (если пользователь уже входил)
      const data = JSON.parse(saved);
      setAuth(data);
      loadPolls(data.token);
    } else {
      // Гость: загружаем опросы без токена (только вопросы и варианты)
      loadPolls(null);
    }
  }, []);

  // Функция загрузки опросов с бэкенда
  const loadPolls = async (token = null) => {
    try {
      // Если пользователь авторизован — добавляем заголовок с токеном
      const headers = token ? { Authorization: `Token ${token}` } : {};
      const res = await fetch('http://127.0.0.1:8000/api/polls/', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Обработка ответа: API может возвращать как массив, так и объект с пагинацией (results)
      const pollsArray = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
      setPolls(pollsArray);

      // Проверяем, голосовал ли пользователь (по наличию my_votes у вариантов)
      if (token) {
        const userHasVoted = pollsArray.some(poll =>
          poll.questions?.some(q =>
            q.choices?.some(ch => ch.my_votes && ch.my_votes.length > 0)
          )
        );
        setHasVoted(userHasVoted);
      } else {
        setHasVoted(false); // Гость не может голосовать
      }
    } catch (e) {
      console.error('Ошибка загрузки опросов:', e);
      setPolls([]);
    }
  };

  // Обработчик входа
  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch('http://127.0.0.1:8000/api/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      // Сохраняем данные авторизации в состоянии и localStorage
      const authData = { token: data.token, username: data.username };
      localStorage.setItem('auth', JSON.stringify(authData));
      setAuth(authData);
      loadPolls(data.token);
      setShowAuthModal(false);
    } else {
      alert('Ошибка входа: ' + (data.error || 'неверные данные'));
    }
  };

  // Обработчик регистрации
  const handleRegister = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch('http://127.0.0.1:8000/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      const authData = { token: data.token, username: data.username };
      localStorage.setItem('auth', JSON.stringify(authData));
      setAuth(authData);
      loadPolls(data.token);
      setShowAuthModal(false);
    } else {
      alert('Ошибка регистрации: ' + (data.error || 'не удалось зарегистрироваться'));
    }
  };

  // Обработчик выхода
  const handleLogout = () => {
    localStorage.removeItem('auth');
    setAuth(null);
    setHasVoted(false);
    setSelections({});
    loadPolls(null); // Перезагружаем опросы как гость
  };

  // Обработчик выбора варианта ответа
  const handleSelect = (questionId, choiceId) => {
    // Гость или уже проголосовавший пользователь не может менять выбор
    if (!auth || hasVoted) return;
    setSelections(prev => ({ ...prev, [questionId]: choiceId }));
  };

  // Обработчик отправки голосов (по всем вопросам)
  const handleSubmit = async () => {
    if (!auth) return;
    try {
      // Отправляем голос по каждому выбранному варианту
      const promises = Object.entries(selections).map(([qId, chId]) =>
        fetch('http://127.0.0.1:8000/api/vote/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ choice: chId })
        })
      );
      await Promise.all(promises);
      setHasVoted(true);
      loadPolls(auth.token); // Перезагружаем данные: теперь будет статистика и my_votes
      alert('Ваш голос учтён!');
    } catch (err) {
      alert('Ошибка при отправке голосов');
      console.error(err);
    }
  };

  // Проверка: все ли вопросы отвечены (для активации кнопки "Отправить")
  const allAnswered = polls.length > 0 && polls.every(poll =>
    poll.questions?.every(q => selections[q.id] != null)
  );

  return (
    <div className="App">
      {/* Шапка сайта */}
      <nav className="navbar navbar-dark" style={{ backgroundColor: 'rgba(26,21,35,0.95)' }}>
        <div className="container">
          <h1>The Witcher</h1>
          {auth ? (
            <div className="text-end">
              {/* Отображаем ЛОГИН, а не ID */}
              <div className="text-light small mb-1">Привет, {auth.username}</div>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          ) : (
            <button className="btn btn-outline-warning" onClick={() => setShowAuthModal(true)}>
              Войти
            </button>
          )}
        </div>
      </nav>

      {/* Основной контент: список опросов */}
      <div className="container mt-4">
        {Array.isArray(polls) && polls.length > 0 ? (
          polls.map(poll => (
            <div key={poll.id} className="card mb-4 p-3">
              <h3>{poll.title}</h3>
              {poll.questions?.map(q => (
                <div key={q.id} className="mt-3">
                  <h5>{q.text}</h5>
                  <div className="list-group mt-2">
                    {q.choices?.map(ch => {
                      const isSelected = selections[q.id] === ch.id;
                      const hasMyVote = ch.my_votes && ch.my_votes.length > 0;

                      // Гость НЕ может выбирать; также нельзя выбирать после отправки
                      const isClickable = auth && !hasVoted && !hasMyVote;

                      return (
                        <div
                          key={ch.id}
                          className={`
                            list-group-item d-flex justify-content-between align-items-center
                            ${
                              hasVoted 
                                ? 'bg-dark text-light' 
                                : (isSelected ? 'bg-warning text-dark' : 'clickable')
                            }
                          `}
                          onClick={() => isClickable && handleSelect(q.id, ch.id)}
                          style={{ cursor: isClickable ? 'pointer' : 'default' }}
                        >
                          <span>
                            {ch.text}
                            {/* До отправки — пометка "← выбрано" */}
                            {!hasVoted && isSelected && (
                              <span className="ms-2 text-warning">← выбрано</span>
                            )}
                            {/* После отправки — пометка "✓ Ваш выбор" */}
                            {hasVoted && hasMyVote && (
                              <span className="ms-2 text-success">✓ Ваш выбор</span>
                            )}
                          </span>
                          {/* Статистика ТОЛЬКО после отправки */}
                          {hasVoted && ch.vote_count !== undefined && (
                            <small className="text-muted">
                              {ch.vote_count} голосов ({ch.percentage}%)
                            </small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Кнопка "Отправить наше мнение" — только для авторизованного и не голосовавшего */}
              {auth && !hasVoted && (
                <div className="text-end mt-3">
                  <button
                    className="btn btn-success"
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                  >
                    Отправить наше мнение
                  </button>
                </div>
              )}

              {/* Сообщение после успешного голосования */}
              {hasVoted && (
                <div className="alert alert-info mt-3">
                  Спасибо! Ваш голос учтён.
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-center mt-5">Нет доступных опросов.</p>
        )}
      </div>

      {/* Модальное окно авторизации (вход/регистрация) */}
      {showAuthModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAuthModal(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Авторизация</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAuthModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${authTab === 'login' ? 'active' : ''}`}
                      onClick={() => setAuthTab('login')}
                    >
                      Вход
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${authTab === 'register' ? 'active' : ''}`}
                      onClick={() => setAuthTab('register')}
                    >
                      Регистрация
                    </button>
                  </li>
                </ul>

                {authTab === 'login' ? (
                  <form onSubmit={handleLogin}>
                    <div className="mb-3">
                      <input name="username" className="form-control" placeholder="Логин" required />
                    </div>
                    <div className="mb-3">
                      <input name="password" type="password" className="form-control" placeholder="Пароль" required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">Войти</button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister}>
                    <div className="mb-3">
                      <input name="username" className="form-control" placeholder="Новый логин" required />
                    </div>
                    <div className="mb-3">
                      <input name="password" type="password" className="form-control" placeholder="Пароль" required />
                    </div>
                    <button type="submit" className="btn btn-success w-100">Зарегистрироваться</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;