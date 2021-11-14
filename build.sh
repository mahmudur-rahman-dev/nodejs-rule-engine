sudo docker build -t rule-engine . &&
sudo docker save rule-engine > ../rule-engine.tar &&
cd .. &&
scp rule-engine.tar penta@202.181.14.19:/home/penta/new_query_service
