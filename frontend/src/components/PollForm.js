// PollForm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PollForm = ({ poll, token, onVoteSuccess }) => {
  const [answers, setAnswers] = useState({}); // { questionId: choiceId }
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Проверим, голосовал ли пользователь ранее (опционально — можно через бэкенд)
  // Для упрощения: если уже отправили — submitted = true

  const handleChoiceChange = (questionId, choiceId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: choiceId
    }));
  };

  const isAllAnswered = () => {
    return poll.questions?.every(q => answers[q.id] != null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAllAnswered()) {
      setErrors({ global: 'Пожалуйста, ответьте на все вопросы.' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Голосуем по каждому вопросу
      const promises = poll.questions.map(q =>
        axios.post(
          'http://127.0.0.1:8000/api/vote/',
          { choice: answers[q.id] },
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      await Promise.all(promises);
      setSubmitted(true);
      onVoteSuccess();
    } catch (error) {
      console.error('Ошибка при голосовании:', error);
      const msg = error.response?.data?.error || 'Не удалось отправить голоса.';
      setErrors({ global: msg });
    } finally {
      setLoading(false);
    }
  };

  // Проверка: можно ли редактировать (если уже голосовали — нельзя)
  const canEdit = !submitted;

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">{poll.title}</h5>

        {errors.global && <div className="alert alert-danger">{errors.global}</div>}

        {poll.questions?.map((q) => (
          <div key={q.id} className="mb-3">
            <h6>{q.text}</h6>
            {q.choices?.map((choice) => (
              <div key={choice.id} className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name={`question-${q.id}`}
                  value={choice.id}
                  checked={answers[q.id] === choice.id}
                  onChange={() => canEdit && handleChoiceChange(q.id, choice.id)}
                  disabled={!canEdit}
                />
                <label className="form-check-label">
                  {choice.text}
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

        {!submitted ? (
          <button
            type="submit"
            className="btn btn-primary mt-3"
            onClick={handleSubmit}
            disabled={!isAllAnswered() || loading}
          >
            {loading ? 'Отправка...' : 'Отправить результаты'}
          </button>
        ) : (
          <div className="alert alert-success mt-3">
            Спасибо! Ваш голос учтён.
          </div>
        )}
      </div>
    </div>
  );
};

export default PollForm;