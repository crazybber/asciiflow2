FROM python:3-alpine

WORKDIR /asciiflow
RUN addgroup -S asciiflow && adduser -S asciiflow -G asciiflow -h /asciiflow
USER asciiflow
COPY . ./

HEALTHCHECK CMD netstat -an | grep 8000 > /dev/null; if [ 0 != $? ]; then exit 1; fi;

ENTRYPOINT ["python3", "-m", "http.server"]
EXPOSE 8000
