# backend/api/views.py
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .serializers import PollSerializer, VoteSerializer
from polls.models import Poll, Vote

class PollList(generics.ListAPIView):
    """
    Эндпоинт: GET /api/polls/
    - Доступен всем (AllowAny)
    - Возвращает опросы с вопросами и статистикой (если пользователь аутентифицирован)
    """
    queryset = Poll.objects.all()
    serializer_class = PollSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        """Передаём request в сериализатор для доступа к текущему пользователю."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class VoteCreate(generics.CreateAPIView):
    """
    Эндпоинт: POST /api/vote/
    - Только для авторизованных
    - Создаёт голос, если пользователь ещё не голосовал за этот вариант
    """
    serializer_class = VoteSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        choice = serializer.validated_data['choice']
        if Vote.objects.filter(user=self.request.user, choice=choice).exists():
            raise serializers.ValidationError("Вы уже голосовали за этот вариант.")
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        # Возвращаем username, а не user_id!
        return Response({'token': token.key, 'username': user.username})
    return Response({'error': 'Неверный логин или пароль'}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Пользователь уже существует'}, status=400)
    user = User.objects.create_user(username=username, password=password)
    token = Token.objects.create(user=user)
    # Возвращаем username!
    return Response({'token': token.key, 'username': user.username})