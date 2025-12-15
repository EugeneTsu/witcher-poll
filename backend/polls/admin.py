from django.contrib import admin

# Register your models here.

from .models import Poll, Question, Choice, Vote

admin.site.register(Poll)
admin.site.register(Question)
admin.site.register(Choice)
admin.site.register(Vote)