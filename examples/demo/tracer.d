#!/usr/sbin/dtrace -s
#pragma D option quiet

resource-machine*:::req-start
{
	printf("%s#%i - %s %s \n", copyinstr(arg0), arg1, copyinstr(arg2), copyinstr(arg3));
}

resource-machine*:::decision-start
{
	printf("%s#%i - > %s(%s)\n", copyinstr(arg0), arg1, copyinstr(arg2), copyinstr(arg3));
}

resource-machine*:::decision-end
{
	printf("%s#%i - < %s\n", copyinstr(arg0), arg1, copyinstr(arg2));
}

resource-machine*:::req-end
{
	printf("%s#%i - Finished: %i\n", copyinstr(arg0), arg1, arg2);
}
