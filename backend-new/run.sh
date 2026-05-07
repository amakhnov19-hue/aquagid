#!/bin/bash
cd /home/developer/projects/aquagid-experimental/backend-new
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8082
