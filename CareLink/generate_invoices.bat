@echo off
cd /d "C:\Users\460020779\Desktop\CareLink\CareLink"
python manage.py generate_monthly_invoices
echo Invoice generation completed at %date% %time% >> invoice_log.txt 