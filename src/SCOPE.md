# Scope

## API

- auth
    - Cognito
- services
    - users
        - store interview rating
        - store voice sample (Generate S3 secure link)
        - Submit chat reply
            - Respond with AI response
    - admins
        - list users
            - list interview ratings
            - list voice samples
- CORS
    - allowed origins

## App

- chat view
    - Text to speech
    - Speech to text
    - Update chat with user text
    - Get AI response from service
- voice sample recording
    - prep the user
    - record (big red button :))
    - pause
    - resume
- admin view
    - list users
        - search by rating?
        - show user interviews
            - rating
            - voice sample
                - link to download/play (Generate S3 secure link)
