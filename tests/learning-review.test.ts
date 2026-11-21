import test from 'node:test';
import assert from 'node:assert/strict';
import {preparedReview,generateLearningReview} from '../src/learning-review.ts';
import {courses} from '../src/content.ts';
test('review evidence names only actually missed questions and accepts an all-correct result',()=>{
 const c=courses[0],answers=c.postQuiz.map(q=>q.answer),good=preparedReview(c,answers);assert.equal(good.missedCount,0);assert.equal(good.focus.length,0);
 answers[0]=(answers[0]+1)%c.postQuiz[0].options.length;const missed=preparedReview(c,answers);assert.equal(missed.missedCount,1);assert.deepEqual(missed.focus[0].questionNumbers,[1]);assert.equal(missed.evidence[0].selected,c.postQuiz[0].options[answers[0]]);
});
