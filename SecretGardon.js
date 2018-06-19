'use strict';

function mylog() {
	var args = Array.prototype.slice.call(arguments);
	args.unshift("SecretGardonContract-->")
	console.log.apply(console, args);
}

function accMul(arg1,arg2)  
 {  
	 var m=0,s1=arg1.toString(),s2=arg2.toString();  
	 try{m+=s1.split(".")[1].length}catch(e){}  
	 try{m+=s2.split(".")[1].length}catch(e){}  
	 return Number(s1.replace(".",""))*Number(s2.replace(".",""))/Math.pow(10,m)  
 } 

function NAS2WEI(bonus) {
	return accMul(bonus, Math.pow(10, 18));
}

function WEI2NAS(bonus) {
	return bonus / Math.pow(10, 18);
}


class responseWriter {
	constructor() {}

	static write(status, data) {
		console.log(JSON.stringify({
			status: status,
			data: data
		}));
		return {
			status: status,
			data: data
		};
	}

	static writeError(message) {
		var status = 1;
		var data = {
			message: message
		};
		return this.write(status, data);
	}

	static writeAcessError() {
		var message = 'access denyed!';
		return this.writeError(message);
	}

	static writeParamError(key) {
		var message = `${key} is necessary!`;
		return this.writeError(message);
	}

	static writeOK(data) {
		var status = 0;
		return this.write(status, data);
	}
}

var Operator = function (obj) {
    this.operator = {};
    this.parse(obj);
};

Operator.prototype = {
    toString: function () {
        return JSON.stringify(this.operator);
    },

    parse: function (obj) {
        if (typeof obj != "undefined") {
            var data = JSON.parse(obj);
            for (var key in data) {
                this.operator[key] = data[key];
            }
        }
    },

    get: function (key) {
        return this.operator[key];
    },

    set: function (key, value) {
        this.operator[key] = value;
    }
};


var StandardToken = function () {
};

StandardToken.prototype = {
    balanceOf: function (_owner) {
        var balance = this.ownedTokensCount.get(_owner);
        if (balance instanceof BigNumber) {
            return balance.toString(10);
        } else {
            return "0";
        }
    },

    ownerOf: function (_tokenId) {
        return this.tokenOwner.get(_tokenId);
    },

    approve: function (_to, _tokenId) {
        var from = Blockchain.transaction.from;

        var owner = this.ownerOf(_tokenId);
        if (_to == owner) {
            throw new Error("invalid address in approve.");
        }
        // msg.sender == owner || isApprovedForAll(owner, msg.sender)
        if (owner == from || this.isApprovedForAll(owner, from)) {
            this.tokenApprovals.set(_tokenId, _to);
            this.approveEvent(true, owner, _to, _tokenId);
        } else {
            throw new Error("permission denied in approve.");
        }
    },

    getApproved: function (_tokenId) {
        return this.tokenApprovals.get(_tokenId);
    },

    setApprovalForAll: function(_to, _approved) {
        var from = Blockchain.transaction.from;
        if (from == _to) {
            throw new Error("invalid address in setApprovalForAll.");
        }
        var operator = this.operatorApprovals.get(from) || new Operator();
        operator.set(_to, _approved);
        this.operatorApprovals.set(from, operator);
    },

    isApprovedForAll: function(_owner, _operator) {
        var operator = this.operatorApprovals.get(_owner);
        if (operator != null) {
            if (operator.get(_operator) === "true") {
                return true;
            } else {
                return false;
            }
        }
    },

    isApprovedOrOwner: function(_spender, _tokenId) {
        var owner = this.ownerOf(_tokenId);
        return _spender == owner || this.getApproved(_tokenId) == _spender || this.isApprovedForAll(owner, _spender);
    },

    transferFrom: function (_from, _to, _tokenId) {
        var from = Blockchain.transaction.from;
        if (this.isApprovedOrOwner(from, _tokenId)) {
            this.clearApproval(_from, _tokenId);
            this.removeTokenFrom(_from, _tokenId);
            this.addTokenTo(_to, _tokenId);
            this.transferEvent(true, _from, _to, _tokenId);
        } else {
            throw new Error("permission denied in transferFrom.");
        }
        
    },

    clearApproval: function (_owner, _tokenId) {
        var owner = this.ownerOf(_tokenId);
        if (_owner != owner) {
            throw new Error("permission denied in clearApproval.");
        }
        this.tokenApprovals.del(_tokenId);
    },

    removeTokenFrom: function(_from, _tokenId) {
        if (_from != this.ownerOf(_tokenId)) {
            throw new Error("permission denied in removeTokenFrom.");
        }
        var tokenCount = this.ownedTokensCount.get(_from);
        if (tokenCount.lt(1)) {
            throw new Error("Insufficient account balance in removeTokenFrom.");
        }
        this.ownedTokensCount.set(_from, tokenCount-1);
    },

    addTokenTo: function(_to, _tokenId) {
        this.tokenOwner.set(_tokenId, _to);
        var tokenCount = this.ownedTokensCount.get(_to) || new BigNumber(0);
        this.ownedTokensCount.set(_to, tokenCount+1);
    },

    mint: function(_to, _tokenId) {
        this.addTokenTo(_to, _tokenId);
        this.transferEvent(true, "", _to, _tokenId);
    },

    burn: function(_owner, _tokenId) {
        this.clearApproval(_owner, _tokenId);
        this.removeTokenFrom(_owner, _tokenId);
        this.transferEvent(true, _owner, "", _tokenId);
    },

    transferEvent: function (status, _from, _to, _tokenId) {
        Event.Trigger(this.name(), {
            Status: status,
            Transfer: {
                from: _from,
                to: _to,
                tokenId: _tokenId
            }
        });
    },

    approveEvent: function (status, _owner, _spender, _tokenId) {
        Event.Trigger(this.name(), {
            Status: status,
            Approve: {
                owner: _owner,
                spender: _spender,
                tokenId: _tokenId
            }
        });
    }

};


class NasColorToken extends StandardToken {
    constructor() {
        super();

        LocalContractStorage.defineProperties(this, {
            "_nameC": null,
        });
    
        LocalContractStorage.defineMapProperties(this, {
            "tokenOwnerC": null,
            "ownedTokensCountC": {
                parse: function (value) {
                    return new BigNumber(value);
                },
                stringify: function (o) {
                    return o.toString(10);
                }
            },
            "tokenApprovalsC": null,
            "operatorApprovalsC": {
                parse: function (value) {
                    return new Operator(value);
                },
                stringify: function (o) {
                    return o.toString();
                }
            },
            
        });

        this.tokenOwner = this.tokenOwnerC;
        this.ownedTokensCount = this.ownedTokensCountC;
        this.tokenApprovals = this.tokenApprovalsC;
        this.operatorApprovals = this.operatorApprovalsC;
    }

    setName(name) {
        mylog('StandardToken set _nameC', this._nameC);
        this._nameC = name;
        mylog('StandardToken after set _nameC', this._nameC);
    }

    name() {
        mylog("this._nameC:", this._nameC);
        return this._nameC;
    }
}


class SecretGardenToken extends StandardToken {
    constructor() {
        super();

        LocalContractStorage.defineProperties(this, {
            "_nameG": null,
        });
    
        LocalContractStorage.defineMapProperties(this, {
            "tokenOwnerG": null,
            "ownedTokensCountG": {
                parse: function (value) {
                    return new BigNumber(value);
                },
                stringify: function (o) {
                    return o.toString(10);
                }
            },
            "tokenApprovalsG": null,
            "operatorApprovalsG": {
                parse: function (value) {
                    return new Operator(value);
                },
                stringify: function (o) {
                    return o.toString();
                }
            },
            
        });

        this.tokenOwner = this.tokenOwnerG;
        this.ownedTokensCount = this.ownedTokensCountG;
        this.tokenApprovals = this.tokenApprovalsG;
        this.operatorApprovals = this.operatorApprovalsG;
    }

    setName(name) {
        mylog('StandardToken set _nameG', this._nameG);
        this._nameG = name;
        mylog('StandardToken after set _nameG', this._nameG);
    }

    name() {
        mylog("this._nameG in name:", this._nameG);
        return this._nameG;
    }
}

class SecretGardonContract {
    constructor() {
        mylog('SecretGardonContract constructor ininin!')
        this.NCT = new NasColorToken();
        this.SGT = new SecretGardenToken();
        this.tokenObject = {NCT: this.NCT, SGT: this.SGT};

        LocalContractStorage.defineProperties(this, {
            "admin": null,
            "deduct": null,
            "boardCnt": null,
            "userBoardCnt": null,
        });
 
        LocalContractStorage.defineMapProperties(this, {
            "boardInfoMap": null,
            "userBoardMap": null,
        });
       
    }

    init(nameNCT, nameSGT, deduct) {
        mylog('this.NCT.setName(nameNCT)');
        this.NCT.setName(nameNCT);
        mylog('this.SGT.setName(nameSGT)');
        this.SGT.setName(nameSGT);

		if (deduct !== undefined) {
			this.deduct = parseFloat(deduct);
		} else {
			this.deduct = 0.99;
		}

		this.admin = Blockchain.transaction.from;
		this.boardCnt = 0;
		this.userBoardCnt = 0;
		this.rewardCnt = 0;
    }

    _getTokenObject(tag) {
        var obj = this.tokenObject[tag];
        return obj;
    }


	_checkAdmin() {
		var from = Blockchain.transaction.from;
		if (from === this.admin) {
			return '';
		} else {
			return responseWriter.writeAcessError();
		}
	}

	_trasaction(to, value) {
		mylog(`transfer ${value} wei to ${to}`);
		var result = Blockchain.transfer(to, value);
		return result;
    }
    
    _checkOwner(info) {
		var owner = info.owner;
		var from = Blockchain.transaction.from;
		if (owner === from) {
			return true;
		} else {
			return false;
		}
    }

    _checkSaleStatus(info) {
		var sale = parseInt(info.sale);
		return Boolean(sale);
	} 
    
	_shareMoney(value, owner) {
		var valueOwner = accMul(value, this.deduct);
		mylog('valueOwner:', valueOwner);
		this._trasaction(owner, valueOwner);

		// to admin
		var valueAdmin = value - valueOwner;
		mylog('valueAdmin:', valueAdmin);
		this._trasaction(this.admin, valueAdmin);
	}


    _clearingColors() {
        return true;
    }










    /**
     * setDeduct 设置购买二手道具和打赏的给用户的分账比例
     * 
     * @param {any} deduct 
     * 
     * @memberOf SecretGardonContract
     */
	setDeduct(deduct) {
		var result = this._checkAdmin();
		if (result) {
			return result;
		}
		
		if (deduct === undefined) {
			return responseWriter.writeParamError('deduct');
		}
		deduct = parseFloat(deduct);
		if (deduct < 0) {
			return responseWriter.writeError('invalid deduct');		
		}
		this.deduct = deduct;
    }


    /**
     * getDeduct
     * 
     * @returns deduct
     * 
     * @memberOf SecretGardonContract
     */
	getDeduct() {
		return responseWriter.writeOK(this.deduct);		
    }
    

    getTokenName(tag) {
        var tokenObject = this._getTokenObject(tag);
        if (!tokenObject) {
			return responseWriter.writeError('invalid tag');		            
        }
        
        var result = tokenObject.name();
        return responseWriter.writeOK(result);
    }

    //  ================== color ======================
    /**
     * add color
     * 
     * @param {any} info 
     * 
     * @memberOf SecretGardonContract
     */
    addColor(info) {

    }


    /**
     * 获取用户颜色
     * 
     * @param {any} user 
     * 
     * @memberOf SecretGardonContract
     */
    getUserColors(user) {

    }


    /**
     * 获取所有的颜色 
     * 
     * @memberOf SecretGardonContract
     */
    getColors() {

    }


    /**
     * 购买颜色
     * 
     * @param {any} tokenId 
     * 
     * @memberOf SecretGardonContract
     */
    buyColor(tokenId) {

    }


    /**
     * 租用颜色
     * 
     * @param {any} tokenId 
     * 
     * @memberOf SecretGardonContract
     */
    rentColor(tokenId) {

    }


    //  ================== board ======================
    /**
     * 上传商城画板
     * 
     * @param {any} info 
     * 
     * @memberOf SecretGardonContract
     */
    addBoard(info) {
		if (!info) {
			return responseWriter.writeParamError('info');
		}

		var result = this._checkAdmin();
		if (result) {
			return result;
		}

		var boardCnt = this.boardCnt + 1;
		this.boardCnt = boardCnt;

		var boardInfo = {}
		try {
			boardInfo.price = parseFloat(info.price);
			boardInfo.category = info.category;
			boardInfo.cntTotal = parseInt(info.cntTotal);
			boardInfo.imgUrl = info.imgUrl;
			boardInfo.boardName = info.boardName;
			boardInfo.opTime = parseInt(info.opTime);
		} catch(err) {
			return responseWriter.writeError(err.message);
		}

		//check info
		for (var key in boardInfo) {
			if (boardInfo[key] === undefined) {
				return responseWriter.writeParamError(key);
			}
		}

		boardInfo.cntRemain = boardInfo.cntTotal;
		boardInfo.income = 0;
		this.boardInfoMap.set(boardCnt, boardInfo);
		mylog('this.boardInfoMap.set(boardCnt, boardInfo):', boardCnt, boardInfo);

	
    }


    /**
     * 获取商城画板list
     * 
     * @param {any} category 画板分类
     * 
     * @memberOf SecretGardonContract
     */
    getBoards(category) {
		var result = [];
		var boardCnt = this.boardCnt;
		for (var index = boardCnt; index > 0; index--) {
			var boardInfo = this.boardInfoMap.get(index);
			mylog('boardInfo in getBoards:', boardInfo);

			if (category && (category !== boardInfo.category)) {
				continue;
			}

			boardInfo.boardId = index;
			result.push(boardInfo);
		}
		return responseWriter.writeOK(result);
	
    }


    /**
     * 商城购买画板
     * 
     * @param {any} boardId 
     * 
     * @memberOf SecretGardonContract
     */
    buyBoard(boardId) {
		var boardInfo = this.boardInfoMap.get(boardId);
		if (!boardInfo) {
			return responseWriter.writeError(`invalid boardId!`);			
		}

		//check cntRemain
		if (boardInfo.cntRemain < 1) {
			return responseWriter.writeError(`board sold out!`);						
		}

		var value = Blockchain.transaction.value;
		var valueNas = WEI2NAS(value);
		if (valueNas < boardInfo.price) {
			return responseWriter.writeError(`value is too little!`);			
		}

		//trasaction and update boardInfoMap
		this._trasaction(this.admin, value);
		boardInfo.income = boardInfo.income + valueNas;
		boardInfo.cntRemain = boardInfo.cntRemain - 1;
		this.boardInfoMap.set(boardId, boardInfo);
		mylog('this.boardInfoMap.set(boardId,boardInfo):', boardId, boardInfo);

		//update userBoardMap
		var userBoardCnt = this.userBoardCnt + 1;
		this.userBoardCnt = userBoardCnt;
		var userBoard = {};
		userBoard.boardId = boardId;
		userBoard.owner = Blockchain.transaction.from;
		userBoard.colors = [];
		this.userBoardMap.set(userBoardCnt, userBoard);
		mylog(
			'this.userBoardMap.set(userBoardCnt, userBoard):',
			userBoardCnt,
			userBoard
		);
    }


    /**
     * 获取用户的画板
     * 
     * @param {any} user 
     * 
     * @memberOf SecretGardonContract
     */
    getUserBoards(user) {
		var result = [];
		var userBoardCnt = this.userBoardCnt;
		mylog('userBoardCnt in getUserBoards:', userBoardCnt);
		mylog('user in getUserBoards:', user);

		for (var userBId=userBoardCnt; userBId > 0; userBId--) {
			var userBoard = this.userBoardMap.get(userBId);
			mylog('userBoard in getUserBoards:', userBoard);
			//check user
			if (user && userBoard.owner !== user) {
				mylog('user not match');
				continue;
			}

			var boardId = userBoard.boardId;
			mylog('boardId in getUserBoards:', boardId);
			var boardInfo = this.boardInfoMap.get(boardId);
			mylog('boardInfo in getUserBoards:', boardInfo);

			Object.assign(boardInfo, userBoard);
			boardInfo.userBId = userBId;
			mylog('boardInfo in getUserBoards:', boardInfo);
			result.push(boardInfo);
		}
		return responseWriter.writeOK(result);
    }


    /**
     * 保存用户的画板
     * 
     * @param {any} boardId 
     * 
     * @memberOf SecretGardonContract
     */
    saveUserBoard(userBId, colors) {
		if (!userBId) {
			return responseWriter.writeParamError('userBId');			
		}

		var userBoard = this.userBoardMap.get(userBId);
		if (!userBoard) {
			return responseWriter.writeError('invalid userBId!');
        }
        
        if (!this._checkOwner(userBoard)) {
			return responseWriter.writeError('you are not the owner of this board!');			
        }
        
        var clearingStatus = this._clearingColors();
        if (!clearingStatus) {
			return responseWriter.writeError('Insufficient color balance!');			
        }

        userBoard.colors = colors;
        this.userBoardMap.set(userBId, userBoard);
        mylog('this.userBoardMap.set(userBId, userBoard)', userBId, userBoard);
    }


    


    //  ================== painting ======================
    /**
     * 上传作品
     * 
     * @param {any} url 
     * @param {any} boardId 
     * @param {any} sale 
     * @param {any} price 
     * 
     * @memberOf SecretGardonContract
     */
    addPainting(url, boardId, sale, price) {

    }


    /**
     * 打赏作品
     * 
     * @param {any} tokenId 
     * 
     * @memberOf SecretGardonContract
     */
    rewardPainting(tokenId) {

    }


    /**
     * 设置作品可售
     * 
     * @param {any} tokenId 
     * @param {any} status 
     * @param {any} price 
     * 
     * @memberOf SecretGardonContract
     */
    setPaintSaleStatus(tokenId, status, price) {

    }


    /**
     * 交易作品
     * 
     * @param {any} tokenId 
     * 
     * @memberOf SecretGardonContract
     */
    tradePainting(tokenId) {

    }
}


module.exports = SecretGardonContract;