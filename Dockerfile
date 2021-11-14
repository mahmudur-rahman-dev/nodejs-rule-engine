FROM node:14-alpine

RUN rm -f /etc/localtime \
&& ln -sv /usr/share/zoneinfo/Asia/Dhaka /etc/localtime \
&& echo "Asia/Dhaka" > /etc/timezone                                                                                          

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app
COPY package*.json ./
#COPY package*.json ./
#COPY .env ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 5000

CMD [ "node", "server.js" ]
