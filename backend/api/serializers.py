# backend/api/serializers.py
from rest_framework import serializers
from polls.models import Poll, Question, Choice, Vote

class ChoiceWithStatsSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()
    my_votes = serializers.SerializerMethodField()

    class Meta:
        model = Choice
        fields = ['id', 'text', 'vote_count', 'percentage', 'my_votes']

    def get_vote_count(self, obj):
        return obj.vote_set.count()

    def get_percentage(self, obj):
        # 🔥 ИСПРАВЛЕНО: считаем голоса по Question через Choice
        total_votes = Vote.objects.filter(choice__question=obj.question).count()
        if total_votes == 0:
            return 0.0
        votes_for_this = obj.vote_set.count()
        return round(votes_for_this / total_votes * 100, 1)

    def get_my_votes(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        return list(obj.vote_set.filter(user=request.user).values_list('id', flat=True))


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceWithStatsSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'choices']


class PollSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Poll
        fields = ['id', 'title', 'date_created', 'questions']


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['choice']