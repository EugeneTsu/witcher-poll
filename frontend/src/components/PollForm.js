// PollForm.js
// Компонент формы для голосования по одному опросу.
// Принимает: объект опроса, токен авторизации и колбэк после успешного голосования.
// Позволяет: выбрать по одному варианту на вопрос, отправить все голоса, показать сообщение об успехе.

import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Библиотека для HTTP-запросов (альтернатива fetch)

// Компонент-функция, принимающая пропсы: poll (опрос), token (токен авторизации), onVoteSuccess (колбэк)
const PollForm = ({ poll, token, onVoteSuccess }) => {
  // Состояние: выбранные пользователем ответы — { questionId: choiceId }
  const [answers, setAnswers] = useState({});

  // Состояние: уже ли отправлен голос? Если да — блокируем изменения
  const [submitted, setSubmitted] = useState(false);

  // Состояние: идёт ли отправка (для показа "Отправка...")
  const [loading, setLoading] = useState(false);

  // Состояние: ошибки (глобальные или по полям)
  const [errors, setErrors] = useState({});

  // Проверим, голосовал ли пользователь ранее (опционально — можно через бэкенд)
  // Для упрощения: если уже отправили — submitted = true

  // === ОБРАБОТЧИК ИЗМЕНЕНИЯ ВЫБОРА ===
  // Вызывается при клике на radio-кнопку варианта ответа.
  // Обновляет состояние `answers`: связывает questionId с выбранным choiceId.
  const handleChoiceChange = (questionId, choiceId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: choiceId
    }));
  };

  // === ПРОВЕРКА: ОТВЕЧЕНЫ ЛИ ВСЕ ВОПРОСЫ? ===
  // Используется для активации/деактивации кнопки отправки.
  const isAllAnswered = () => {
    return poll.questions?.every(q => answers[q.id] != null);
  };

  // === ОБРАБОТЧИК ОТПРАВКИ ФОРМЫ ===
  // Вызывается при нажатии кнопки "Отправить результаты".
  const handleSubmit = async (e) => {
    e.preventDefault(); // Предотвращаем стандартное поведение формы (перезагрузку страницы)

    // Проверка: все ли вопросы отвечены?
    if (!isAllAnswered()) {
      setErrors({ global: 'Пожалуйста, ответьте на все вопросы.' });
      return;
    }

    // Устанавливаем состояния: идёт загрузка, ошибок нет
    setLoading(true);
    setErrors({});

    try {
      // Формируем массив промисов: по одному запросу на каждый вопрос
      const promises = poll.questions.map(q =>
        axios.post(
          'http://127.0.0.1:8000/api/vote/', // Эндпоинт голосования
          { choice: answers[q.id] },          // Тело запроса: ID выбранного варианта
          {
            headers: {
              Authorization: `Token ${token}`, // Токен авторизации
              'Content-Type': 'application/json',
            },
          }
        )
      );

      // Ждём завершения всех запросов
      await Promise.all(promises);

      // Устанавливаем флаг: голос отправлен
      setSubmitted(true);

      // Вызываем колбэк, переданный из родительского компонента (например, для обновления данных)
      onVoteSuccess();
    } catch (error) {
      console.error('Ошибка при голосовании:', error);
      // Извлекаем сообщение об ошибке из ответа сервера (если есть)
      const msg = error.response?.data?.error || 'Не удалось отправить голоса.';
      setErrors({ global: msg });
    } finally {
      // В любом случае — завершаем загрузку
      setLoading(false);
    }
  };

  // === ПРОВЕРКА: МОЖНО ЛИ РЕДАКТИРОВАТЬ ОТВЕТЫ? ===
  // Если голос уже отправлен — редактирование запрещено
  const canEdit = !submitted;

  // === РЕНДЕР КОМПОНЕНТА ===
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">{poll.title}</h5>

        {/* Отображение глобальной ошибки (если есть) */}
        {errors.global && <div className="alert alert-danger">{errors.global}</div>}

        {/* Проходим по всем вопросам опроса */}
        {poll.questions?.map((q) => (
          <div key={q.id} className="mb-3">
            <h6>{q.text}</h6>
            {/* Проходим по всем вариантам ответа на вопрос */}
            {q.choices?.map((choice) => (
              <div key={choice.id} className="form-check">
                {/* Radio-кнопка: можно выбрать только один вариант на вопрос */}
                <input
                  className="form-check-input"
                  type="radio"
                  name={`question-${q.id}`} // Группировка по questionId
                  value={choice.id}
                  // Проверка: выбран ли именно этот вариант?
                  checked={answers[q.id] === choice.id}
                  // Обработчик: при изменении — вызывается handleChoiceChange (если можно редактировать)
                  onChange={() => canEdit && handleChoiceChange(q.id, choice.id)}
                  // Отключаем кнопку, если уже голосовали
                  disabled={!canEdit}
                />
                <label className="form-check-label">
                  {choice.text}
                  {/* После отправки — помечаем выбранный вариант */}
                  {submitted && (
                    <small className="text-muted ms-2">
                      {/* Пока не можем показать статистику — нужно API для /votes/ */}
                      (выбрано)
                    </small>
                  )}
                </label>
              </div>
            ))}
          </div>
        ))}

        {/* Условный рендер: кнопка отправки или сообщение об успехе */}
        {!submitted ? (
          // Кнопка видна, пока не отправлен голос
          <button
            type="submit"
            className="btn btn-primary mt-3"
            // При клике — вызывается handleSubmit
            onClick={handleSubmit}
            // Кнопка неактивна, если не все вопросы отвечены или идёт загрузка
            disabled={!isAllAnswered() || loading}
          >
            {loading ? 'Отправка...' : 'Отправить результаты'}
          </button>
        ) : (
          // После отправки — показываем сообщение
          <div className="alert alert-success mt-3">
            Спасибо! Ваш голос учтён.
          </div>
        )}
      </div>
    </div>
  );
};

export default PollForm;