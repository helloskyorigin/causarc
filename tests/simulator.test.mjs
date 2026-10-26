import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../assets/simulator.mjs';
test('concurrent reads without safeguard can breach invariant',()=>{const r=simulate({payment:100,request:100,mode:'concurrent',atomic:false});assert.equal(r.refunded,200);assert.equal(r.breached,true);assert.equal(r.excess,100);});
test('atomic safeguard blocks second commit',()=>{const r=simulate({payment:100,request:100,mode:'concurrent',atomic:true});assert.equal(r.refunded,100);assert.equal(r.blocked,1);assert.equal(r.passed,true);});
test('sequential execution avoids duplicate full refunds',()=>{const r=simulate({payment:100,request:100,mode:'sequential'});assert.equal(r.refunded,100);assert.equal(r.passed,true);});
test('smaller requests are safe when sum within balance',()=>{const r=simulate({payment:100,request:40,mode:'concurrent'});assert.equal(r.refunded,80);assert.equal(r.passed,true);});
test('reject invalid inputs',()=>{assert.throws(()=>simulate({payment:-1}));assert.throws(()=>simulate({request:Infinity}));assert.throws(()=>simulate({mode:'invalid'}));});
test('trace records both reads before commits',()=>{const r=simulate();const names=r.events.map(e=>e.action);const a=names.indexOf('Read payment ledger');const lastRead=names.lastIndexOf('Read payment ledger');const firstCommit=names.findIndex(x=>x.startsWith('Commit '));assert.ok(a>=0);assert.ok(lastRead> a);assert.ok(firstCommit>lastRead);});
