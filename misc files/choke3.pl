
/*
is(dangerous(Danger)).


is(chokingHazard(Hazard)).

*/

small(grapes).
edible(grapes).



%cans can harm anyone and launch projectiles
can(gun, harm(Y)).
can(gun, launch(projectiles)).


%Anything is dangerous if it can harm anything
iz(dangerous(X)) :- can(X, harm(Y)) .




%a choking hazard is anything that is small, not edible and can harm a child
iz(chokingHazard(X)) :- 
    \+(iz(edible(X))), 
    iz(dangerous(child)), 
    
    iz(small(X)).



is(dangerous(X)) :- iz(chokingHazard(X)).

is(X) :- iz(X).
iz(chokingHazard(kinderegg)).
