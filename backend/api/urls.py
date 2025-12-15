# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('polls/', views.PollList.as_view(), name='poll-list'),
    path('vote/', views.VoteCreate.as_view(), name='vote-create'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
]