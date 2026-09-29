from django import forms
from .models import ContactMessage, Review


class CheckoutForm(forms.Form):
    full_name = forms.CharField(max_length=160)
    email = forms.EmailField()
    phone = forms.CharField(max_length=20)
    address = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}))
    city = forms.CharField(max_length=100)
    state = forms.CharField(max_length=100)
    postal_code = forms.RegexField(r"^[1-9][0-9]{5}$", error_messages={"invalid": "Enter a valid 6-digit PIN code."})
    payment_method = forms.ChoiceField(choices=(("cod", "Cash on delivery"), ("online", "Pay online")))


class TrackingForm(forms.Form):
    order_number = forms.CharField(max_length=24)
    email = forms.EmailField()


class ContactForm(forms.ModelForm):
    class Meta:
        model = ContactMessage
        fields = ("name", "email", "phone", "subject", "order_number", "message")
        widgets = {"message": forms.Textarea(attrs={"rows": 5})}


class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ("name", "rating", "title", "body")
        widgets = {"rating": forms.Select(choices=[(i, f"{i} stars") for i in range(5, 0, -1)]), "body": forms.Textarea(attrs={"rows": 4})}

