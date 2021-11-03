

/**$X is theif if:
	$X has $Y,
	$X has permission($Y). */
	const zip = (a, b) => Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);

class Token{
	static specialChars = [",", ":", ".", "(", ")", "?"];
	static discardChars = [" ", "\t", "\n"];
	static keywords = ["if"];

	constructor(value, type){
		this.value = value;
		if(type){
			this.type = type;
		}else if(Token.specialChars.includes(value)){
			this.type = "operator";
		}else if(Token.keywords.includes(value)){
			this.type = "keyword";
		}else{
			this.type = "identifier";
		}
	}

	toString(){
		return this.value;
	}

	is(value){
		if(Array.isArray(value))return value.includes(this.value)
		return this.value == value;
	}
}

class Tokenizer{


	constructor(data){
		this.data = data;
	}

	tokenize(){
		let tokens = []
		let token = "";

		function accept(tokenVal){
			let value = (tokenVal) ? tokenVal : token;
			if(value.trim().length==0)return;
			tokens.push(new Token(value));
			token = "";
		}

		for(let i=0; i<this.data.length; i++){
			let char = this.data[i];
			if(char==" "){
				accept();
				continue;
			}else if(Token.specialChars.includes(char)){
				accept();
				accept(char)
				continue;
			}
			if(!Token.discardChars.includes(char))token += char;
		}
		if(token.length>0)accept();
		return tokens;
	}
}


class Parser{

	constructor(tokens){
		this.tokens = tokens;
	}

	eat(){
		return this.tokens.shift();
	}

	peek(){
		return this.tokens[0];
	}

	getAST(delimiter="."){
		let ast = new ClauseNode();
		let currentNode = ast;
		let node = null;
		//console.log(this.tokens.toString())
		while(this.tokens.length > 0){
			let token = this.eat();

			if(token.is([".", delimiter])){
				currentNode.push(node);
				node = null;
				if(delimiter!="." && token.is("."))return ast;
			}else if(token.is("if") && node instanceof FactNode){
				this.eat();
				node.predicates = this.getAST(",").clauses;
				currentNode.push(node);
				//console.log(this.tokens.toString());
				node = null;
			}else if(token.is("?")){
				currentNode.push(new QueryNode(node));
				node = null;
			}else if(node==null){
				
				node = new FactNode(token, this.eat(), this.eat());
		
			}
		}
		return ast;
	}

}


class AstNode{

	get type(){
		return this.constructor.name;
	}

	eval(world){

	}
}

class QueryAnswer {
	constructor(outcome, assumptions={}){
		this._outcome = outcome;
		this.assumptions = assumptions;
		this.answers = [];
	}

	get outcome(){
		return this._outcome;
	}

	assume(assumption){
		Object.assign(this.assumptions, assumption)
	}

	set outcome(value){
		this._outcome = value;
	}

	assumptionsString(){
		
		return Object.entries(this.assumptions).map(([key, value]) => `${key} = ${value}`).join(", ");
	}

	completeAssumption(){
		let assumptions = [];
		for(let answer of this.answers){
			//console.log(answer.assumptions)
			assumptions.push(answer.assumptions)
		}
		return assumptions
	}
	

	toString(){
		let result = "";
		for(let answer of this.answers){
			//console.log(answer.toString());
			result += answer.assumptionsString()+"\n";
		}
		result+=this.outcome;
		return result;
	}
}


class QueryNode extends AstNode{
	constructor(node){
		super();
		this.node = node;
	
	}
	eval(world, assume={}, seen = []){
		
		let answer = new QueryAnswer(false);
		let complex = false;
		let factQuery =  new Fact(world, this.node);
		let subjectNum = 0;
		let answers = [];
	
		for(let subject of factQuery.subjects){
			
			if(subject.name[0]==("$")){
				complex = true
				
				
				for(let subjectName in world.subjects){
					
					//if(assume[subject.name]==null){
						assume[subject.name] = subjectName;
					//}
					
					let substitutionFact = this.node.subjects.map((subject, index)=> {
						if(subjectNum != index && assume[subject.value]!=null) return new Token(assume[subject.value])
						else if(subjectNum == index) return new Token(subjectName) 
						else return subject;
					
					});
					
					
					
					let factStr = substitutionFact.toString();
			
					if(seen.includes(factStr) && !factStr.includes("$")){
						continue;
					}
					//console.log("bean")
					seen.push(factStr);

					let given = {...assume};
					//given[subject.name] = subjectName;
					
					//console.log("peepeepoopoo",)
					let query = new QueryNode(new FactNode(...substitutionFact));
					let result = query.eval(world, given, seen);
					if(result.outcome){
						answer.outcome = true;
						given[subject.name] = subjectName;

						result.assume({...given});
		
						answers = answers.concat(result.answers)
						if(!result.complex)answers.push(result);
					}
				}
				
			}
			subjectNum+=1;
		}
		answer.answers = answers;
		answer.complex = complex;
		if(!complex){
			if(factQuery.predicates>0){
				//console.log("hoopla")
			}
			for(let fact of world.facts){
				//if(evalPredicates==false)console.log("FALSE")
				//console.log(evalPredicates)
				//console.log(fact.toString(),"vs",factQuery.toString(),fact.variadic(), factQuery.strictIs(fact))
				if(fact.variadic() && factQuery.strictIs(fact)){
					//console.log(factQuery.toString())
					//console.log("woijf")
					//console.log("fopk", factQuery.toString())
					if(fact.validVariadicPredicateFact(assume, factQuery)){
						answer.outcome = true;
						return answer;
					}
					
				}else if(factQuery.is(fact) ){
					//console.log("woijf")
					answer.outcome = true;
					return answer;
				}
			}
		}
		
		return answer;
	}
	toString(){
		return this.node.toString()+"?";
	}
}

class ClauseNode extends AstNode{

	constructor(){
		super();
		this.clauses = [];
	}

	push(clause){
		this.clauses.push(clause);
	}

	toString = () => this.clauses.map((clause)=>clause.toString());

	eval(world){
		let results = [];
		for(let clause of this.clauses){
			let result = clause.eval(world);
			if(result!==undefined)results.push(result);
		}
		if(results.length == 1)return results[0];
		return results;
	}

}

class FactNode extends AstNode{
	  constructor(...subjects){
		super();
		//console.log("fpoegeorij", subjects[0].constructor.name)
		this.subjects = subjects;
		this.predicates = [];
	}

	toString = () => this.subjects.join(" ");


	eval(world){
		world.addFact(this);
		return new QueryAnswer(true);
	}


}

/**
 * 
 * marc is dumb if:
 * 		agustin is watching,
 * 		day is tuesday.
 * 
 */

class Fact{
	constructor(world, factNode){

		this.world = world;
		this.factNode = factNode;
		//console.log("ss",factNode, factNode.constructor.name);
		//console.log(factNode.constructor.name, factNode, factNode.predicates)
		
		this.predicates = factNode.predicates.map((predicate)=>{
			//console.log("vvs", predicate)
			return new QueryNode(predicate)
		});
		//console.loge(this.predicates)
		/*
		this.subject1 = this.world.getSubject(factNode.subject1.value);
		this.subject2 = this.world.getSubject(factNode.subject2.value);
		this.action = this.world.getSubject(factNode.action.value);*/
		
		this.subjects = factNode.subjects.map((subject)=>this.world.getSubject(subject.value));
	}

	factWithAssumption(assume, world=null){
		if(world==null)world = this.world;
		let substitutionTerms = this.subjects.map((subject, index)=> {
			//console.log(assume,subject.name)
			if(assume[subject.name]!=null) return new Token(assume[subject.name])
			//else if(subjectNum == index) return new Token(subjectName) 
			else return new Token(subject.name);
		
		});
		//console.log(substitutionTerms.toString(),substitutionTerms[0].constructor.name.toString())
		let factNode = new FactNode(...substitutionTerms);
		factNode.predicates = this.predicates.map((query)=>{
		//	console.log("fax", new Fact(world, query.node).factWithAssumption(assume,world).toString)
			return new Fact(world, query.node).factWithAssumption(assume,world).factNode
		});
		//factNode.predicates = this.predicates.map((predicate)=>pre);
		let fact = new Fact(world, factNode);
		
		return fact;
	}


	validatePredicates(world){
		for(let predicate of this.predicates){
				
			//console.log(predicate.constructor.name)

			let result = predicate.eval(this.world)

			if(!result.outcome){
				//console.log("pred:",predicate.toString(), "fax:",this.world.facts.toString())
				//console.log(assumptions)
				return false;
			}
		}
		return true;
	}
	
	variadic(){
		return this.subjects.find((subject)=>subject.isVar())!=null;
	}

	//qualifiers is what the parenthesis thing is called

	/**
	 * $x has fun? 
	 $x has fun if: $x has apples.
	 */

	validVariadicPredicateFact(assume, fact){
		//let hasVar = 
		
		if(!this.variadic()) return false;
		let myVars = this.subjects.filter((subject)=>subject.isVar()).map((subject)=>subject.name);
		//console.log(assume,fact.toString())
	//	console.log("fewj")
		//search thru facts, if fact is a query IE: $x has fun if: $x has apples.
		//evaluate the query like so:  [term] has fun if: [term] has apples
		//let world;
		for(let varSubject of this.subjects){
			if(varSubject.isVar()){
				//for(let subject in this.world.subjects){
					let world = this.world.copyWorld(this);
					if(world.facts.length == 0)return true;
					let varList = []
					let varListPos = {}
					for(let predicate of this.predicates){
						//console.log(predicate)
						let i = 0;
						for(let termToken of predicate.node.subjects){
							//let term = new Subject(termToken);
							//console.log(termToken)
							if(termToken.value[0]=="$" && !varList.includes(termToken.value)){
								varList.push(termToken.value);
								varListPos[termToken.value] = i;
							}
							i+=1;
						}
					}
			
					let newAssume = {}
				
					
					for(let i=0;i<Object.entries(assume).length; i++){
						// i should be varListPos[varList[i]]
						if(!myVars.includes(varList[i]))continue;
						if(!fact.subjects[varListPos[varList[i]]])continue;
						newAssume[varList[i]] = fact.subjects[varListPos[varList[i]]].name
					}
					//console.log(newAssume)
					//console.log(this.toString())
					let newFact = this.factWithAssumption(newAssume, world);
					//console.log("",fact.toString(), "vs\t\t", newFact.toString())
					if(newFact.validatePredicates()){
						return true;  
					}
				//}
				//console.log("ere?")
				
			}
		}
		//console.log("fax",world.facts.toString())
		return false;
		//console.log("here")
	}

	is(other, assumePredicates=true){
	//	let assumptionList = [];
		//let predicates = [...this.predicates]
		let num = Math.random();

		if(assumePredicates){
			
			for(let fact of this.world.facts){
				 if(fact.is(this, false)){
					this.predicates = this.predicates.concat(fact.predicates);
				}
			}
			


			

			for(let predicate of this.predicates){
				
				//console.log(predicate.constructor.name)

				let result = predicate.eval(this.world)
	
				if(!result.outcome){
					//console.log(assumptions)
					return false;
				}
			}
			
		}


		for(let [a,b] of zip(this.subjects, other.subjects)){
		
			

			if(a.name!=b.name){
				//console.log("")
				return false;
			}
		}
		//console.log(" ")
		//console.log("")
		return true;
		//return other.subject1 == this.subject1 && other.subject2 == this.subject2 && other.action == this.action;
	}

	toString () {
		let str = this.factNode.toString();
		if(this.predicates.length > 0){
			str+=" if: "
			//console.log(this.predicates)
			str+=this.predicates.map((predicate)=>predicate.toString()).join(", ")
		}
		return str;
		
	};

	strictIs(other){
		for(let [a,b] of zip(this.subjects, other.subjects)){
			//console.log(JSON.stringify(a))
			//console.log(a,"vs",b)
			//if((a.name[0]=="$" || b.name[0]=="$") ){
			//console.log("\t", a.name, "vs", b.name)
			if(a.isVar() || b.isVar())continue;

			if(a.name!=b.name){
				//console.log("")
				return false;
			}
		}
		return true;
	}

}



class World {

	constructor(){
		this.facts = [];
		this.subjects = {}
	}

	getSubject(name){
		
		if(name[0]=="$")return new Subject(name);
		//if(name != null && name[0]=="$")return null;
		if(!this.subjects[name]) this.subjects[name] = new Subject(name);
		return this.subjects[name];
	}

	copyWorld(without){
		let copy = new World();
		//!fact.is(without, false)
		copy.facts = this.facts.filter((fact)=>!fact.strictIs(without)); 
		copy.subjects = {...this.subjects};
		return copy;
	}

	addFact(fact){
		
		//this.getSubject(fact.subject1.value);//[fact.action.value] = fact.subject2.value ;
		//console.log("kfeoij",fact,)
		this.facts.push(new Fact(this, fact));
		//console.log("efw",this.facts.toString())
	}

	query(fact){

	}

}

class Subject {
	constructor(name){ 
		this.name = name;
	}
	toString(){
		return this.name;
	}
	isVar(){
		return this.name[0]=="$";
	}
}

function assert(testName, worldData, query, shouldBe){
	


	let tokens = new Tokenizer(worldData).tokenize();

	let ast = new Parser(tokens).getAST();

	let world = new World();
	ast.eval(world);
	//console.log(world.facts.toString())
	
	//query = `matt has trust_issues?`
	//
	//query = `$x has fun?`
	tokens = new Tokenizer(query).tokenize();
	//console.log(tokens2.toString())
	ast = new Parser(tokens).getAST();
	let res = ast.eval(world);
	//console.log(res.toString())
	let passfail = (res.toString()==shouldBe.join("\n"));
	if(!passfail){
		console.error("FAILED:", testName, res.toString())
	}
	return passfail;
}

function assertTests(){
	//console.clear()


	assert("basic truth", `john is fun.`, "john is fun?", ["true"])
	assert("basic lie", `john is fun.`, "john is sad?", ["false"])

	assert("single variadic query", `john is fun.`, "$x is fun?", ["$x = john", "true"])
	assert("single variadic query (2 answer)", `frank has hat. john is fun. stacy is fun.`, "$x is fun?", ["$x = john", "$x = stacy", "true"]);
	assert("double variadic query", `john is fun. stacy has fun.`, "$x has $y?", ["$x = stacy, $y = fun", "true"]);
	assert("triple variadic query", `john is fun. stacy has fun.`, "$x $y $z?", ["$x = john, $y = is, $z = fun", "$x = stacy, $y = has, $z = fun", "true"]);
	
	assert("fact with predicate",`john is scared if: stacy has apples, stacy has fun. stacy has apples. stacy has fun.`, "$x is scared?", ["$x = john", "true"]);
	assert("fact with predicate",`john is scared if: stacy has apples, stacy has fun. stacy has apples.`, "$x is scared?", ["false"]);
	assert("lie with predicate ", `john is scared if: stacy has apples. stacy has self_control.`, "$x is scared?", ["false"]);
	
	assert("multivar preducate fact", 
		`jill has apples. 
		steve has taste if: $x has apples. 
		john has fun if: steve has taste.`,
		"$b has fun?",
		["$b = john", "true"]
	)
}

/**
 * 
 * test this:
 * 
 * 
  jill has apples.
	steve has taste if: $x has apples.
	john has fun if: steve has taste.

	query: $x has fun?

	result:
	$x = john 
	true
 * 
 */

function test(){
	//anyone has trust issues if matt has apples
	console.clear()


	let worldData = `

	
	
	john has apples.
	matt does run.
	$a $b $c if: $x $y $z.
	` 

	let tokens = new Tokenizer(worldData).tokenize();

	let ast = new Parser(tokens).getAST();

	let world = new World();
	ast.eval(world);
	//console.log(world.facts.toString())
	
	//query = `matt has trust_issues?`
	//
	
	
	query = `
	
	$1 $2 $3?
	`
	tokens = new Tokenizer(query).tokenize();
	//console.log(tokens2.toString())
	ast = new Parser(tokens).getAST();
	let res = ast.eval(world);
	console.log("------------------------\n");
	console.log(res.toString());
	//console.log("------------------------\n");
	assertTests();
};

function cli(){
	const readline = require("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	let world = new World();
	console.clear()
	function input(){
		rl.question("> ", function(command) {
			let tokens = new Tokenizer(command).tokenize();

			//let ast = new Parser(tokens).getAST();
			let result = new Parser(tokens).getAST().eval(world);
			console.log(result.toString()+"\n")
			input();
		});
	}
	input();
}

//assertTests();
test();
//cli();
//console.log(ast.eval(world)); 

/*
	
	marc has fun if: 

*/