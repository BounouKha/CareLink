from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group
from CareLink.models import Coordinator

@receiver(post_save, sender=Coordinator)
def assign_coordinator_group(sender, instance, created, **kwargs):
    if created:
        coordinator_group, _ = Group.objects.get_or_create(name="coordinator")
        if instance.user:
            instance.user.groups.add(coordinator_group)
            print(f"[DEBUG] Coordinator group assigned to user: {instance.user}")
