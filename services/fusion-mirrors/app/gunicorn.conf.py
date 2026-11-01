"""Loopback WSGI service behind the existing website reverse proxy."""
bind = 'localhost:8765'
workers = 2
worker_class = 'sync'
timeout = 30
max_requests = 1000
max_requests_jitter = 100
limit_request_line = 2048
accesslog = '-'
errorlog = '-'
capture_output = True
