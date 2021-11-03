

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
	constructor(outcome, assumtions={}){
		this._outcome = outcome;
		this.assumtions = assumtions;
		this.answers = [];
	}

	get outcome(){
		return this._outcome;
	}

	assume(assumption){
		Object.assign(this.assumtions, assumption)
	}

	set outcome(value){
		this._outcome = value;
	}

	assumtionsString(){
		
		return Object.entries(this.assumtions).map(([key, value]) => `${key} = ${value}`).join(", ");
	}
	

	toString(){
		let result = "";
		for(let answer of this.answers){
			//console.log(answer.toString());
			result += answer.assumtionsString()+"\n";
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
		let factQuery = new Fact(world, this.node);
		let subjectNum = 0;
		let answers = [];
	
		for(let subject of factQuery.subjects){
			
			if(subject.name[0]==("$")){
				complex = true
				
				
				for(let subjectName in world.subjects){
					
			
					assume[subject.name] = subjectName;
					let substitutionFact = this.node.subjects.map((subject, index)=> {
						if(subjectNum != index && assume[subject.value]!=null) return new Token(assume[subject.value])
						else if(subjectNum == index) return new Token(subjectName) 
						else return subject;
					
					});
					
					
					let factStr = substitutionFact.toString();
					if(seen.includes(factStr) && !factStr.includes("$")){
						continue;
					}
					seen.push(factStr);

					let given = {...assume};
					//given[subject.name] = subjectName;
					
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

				if(factQuery.is(fact)){
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

	is(other, assumePredicates=true){
		if(assumePredicates){
			for(let fact of this.world.facts){
				//console.log(fact.toString(),"vs",this.toString())
				if(fact.is(this, false)){
					
					this.predicates = this.predicates.concat(fact.predicates);
					//break;
					//console.log(this.predicates)
				}
			}
			//console.log("oek");
			//console.log(this.predicates)
			for(let predicate of this.predicates){
			
				if(!predicate.eval(this.world).outcome){
					//console.log("fopkewp")
					//console.log(predicate.eval(this.world).outcome)
					//console.log(predicate.toString())
					return false;
				}
			}
		}
		
		for(let [a,b] of zip(this.subjects,other.subjects))if(a!=b)return false;
		
		return true;
		//return other.subject1 == this.subject1 && other.subject2 == this.subject2 && other.action == this.action;
	}

	toString = () => this.factNode.toString();
}



class World {

	constructor(){
		this.facts = [];
		this.subjects = {}
	}

	getSubject(name){
		if(name == null){
			console.log("this shouldn't be here ")
		}
		if(name[0]=="$")return new Subject(name);
		//if(name != null && name[0]=="$")return null;
		if(!this.subjects[name]) this.subjects[name] = new Subject(name);
		return this.subjects[name];
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

}





function test(){
	//anyone has trust issues if matt has apples
	let worldData = `

	$X has trust_issues if: matt has apples.
	
	

	`
	let tokens = new Tokenizer(worldData).tokenize();

	let ast = new Parser(tokens).getAST();

	let world = new World();
	ast.eval(world);
	//console.log(world.facts.toString())
	
	//query = `matt has trust_issues?`
	query = `$X has trust_issues?`
	tokens = new Tokenizer(query).tokenize();
	//console.log(tokens2.toString())
	ast = new Parser(tokens).getAST();
	let res = ast.eval(world);
	console.log(res.toString());
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

test();
//cli();
//console.log(ast.eval(world));