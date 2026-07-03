download package move of all this into a backend folder for a better structure npm install and this is ready to use:- 

few changes need to be made to few files before moving on:-
1> push the drizzle <npx drizzle-kit push> 
2> in package.json chnage in "dev" to "tsx watch src/index.tsc" also run <npm i tsx>
3> remove every instaance of healthcheck
4> fix few minor mistakes in emails
5> fix resend-emailverification controller ad its router minor errors
6> .cookie(refreshtoken) in refresh-accesstoken controller has an spelling mistake
7> in index.ts import dotenv/config on top of file and no need for configuring dotenv


