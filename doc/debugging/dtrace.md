# DTrace


		$ sudo dtrace -l -P resource*
		ID   PROVIDER                MODULE              FUNCTION NAME
		4525 resource-machine89061   mod-0x103904cb0     req-start req-start
		4526 resource-machine89061   mod-0x103904cb0     req-end req-end
		4527 resource-machine89061   mod-0x103904cb0     decision-start decision-start
		4528 resource-machine89061   mod-0x103904cb0     decision-end decision-end
