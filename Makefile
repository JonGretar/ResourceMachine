.PHONY: test test-cov istanbul

test:
	./node_modules/.bin/mocha --reporter spec test/**/*_test.js

test-cov: istanbul
	./node_modules/.bin/istanbul check-coverage \
		--statements 85 \
		--branches 75 \
		--functions 90 \
		--lines 85

istanbul:
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- -R spec  test/**/*_test.js

coveralls: istanbul
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js
