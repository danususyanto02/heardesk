export interface ActivityReader { counts(actorId:string,start:Date,end:Date):Promise<readonly {day:string;count:number}[]>;years?(actorId:string):Promise<readonly number[]> }
