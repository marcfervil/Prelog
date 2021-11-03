const pl = require("tau-prolog");

(function( pl ) {
    // Name of the module
    var name = "my_module";
    // Object with the set of predicates, indexed by indicators (name/arity)
    var predicates = function() {
        return {
			"talk/0": function(thread, point, atom) { 
				console.log("fodpkf")
			},
			"talk/1": function(thread, point, atom) { 
				console.log("fodpkf")
			},
			"talk/2": function(thread, point, atom) { 
				console.log("fodpkf")
			}
        };
    };
	console.log(typeof module !== undefined)
    // List of predicates exported by the module
    var exports = Object.entries(predicates()).map((key)=>key[0])
	//console.log( JSON.stringify(Object.entries(predicates()).map((key,value)=>key[0]) )  )
    // DON'T EDIT
    if( typeof module !== 'undefined' ) {
		
        module.exports = function(tau_prolog) {
			
            pl = tau_prolog;
            new pl.type.Module( name, predicates(), exports );
        };
    } else {
		
        new pl.type.Module( name, predicates(), exports );
    }
})( pl );
var session = pl.create();

/**
 * 
 *	 Another example on cause and effect
 
stabs(tybalt,mercutio,sword).
hates(romeo, X) :- stabs(X, mercutio, sword).
% hates(romeo, X). = X = tybalt 
 * 
 */

//redefined "is" to "$is"
//swipl
//%iz(dangerous(kinderegg)).
//theft(Theif), takes(Theif, Thing).
const goal = `

is(Danger, dangerous).


is(Hazard, chokingHazard).

%hats(X).

`;
const show = x => console.log(session.format_answer(x));
session.consult("choke4.pl", {
	
    success: function() {
        session.query(goal, {
            success: function() {
				session.answers(show);
                //session.answer(show);
            }
        })
    },
	error: function(err) { console.log("NO!!",err)}
});	