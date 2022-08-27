forever stopall;

git reset --hard origin/master;
git pull origin master;

forever start ./express/app.js;