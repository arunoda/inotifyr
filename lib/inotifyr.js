var fs = require('fs');
var Inotify = require('inotify').Inotify;

var CREATED = Inotify.IN_CREATE | Inotify.IN_MOVED_TO;
var DELETED = Inotify.IN_DELETE | Inotify.IN_MOVE_SELF | Inotify.IN_MOVED_FROM;

//expose to others
exports.Inotify = Inotifyr;

for(var constant in Inotify) {
	exports.Inotify[constant] = Inotify[constant];
}

function Inotifyr(flag) {
	
	var linkStore = {};
	var allLinks = {};
	var parent = new Inotify(flag);

	this.addWatch = function(watch) {
		
		var rootWatch = cloneWatch(watch);
		rootWatch['callback'] = newCallback(watch, "");
		rootWatch.watch_for = rootWatch.watch_for | CREATED | DELETED
		//add the base watcher
		console.info('adding main watcher to path: %s', rootWatch.path);
		var link = parent.addWatch(rootWatch);

		//add watches to other folders as well (only 1 depth)
		recursiveWatcher(watch);

		return link;
	};

	this.removeWatch = function(link) {
		parent.removeWatch(link);
	}

	//generate a new callback
	function newCallback(oldWatcher, dir) {
		
		return function (event) {

			if(dir.trim() == '') {
				event.dir = oldWatcher.path;
			} else {
				event.dir = oldWatcher.path + '/' + dir;				
			}

			if(event.mask & Inotify.IN_ISDIR) {
				if(event.mask & CREATED) {
					//folder created
					console.log('new folder created and added watcher: %s', event.name);
					addWatchToParent(oldWatcher, event.dir + '/' + event.name);
				} else if(event.mask & DELETED) {
					//folder deleted
					console.log('folder created and remove watcher: %s', event.name);
				}	
			}

			if(event.mask & oldWatcher.watch_for) {
				oldWatcher.callback(event);
			}
		}
	}

	//recursively watch the path in the watch for just one level
	function recursiveWatcher(watch) {

		linkStore[watch.path] = [];
		fs.readdir(watch.path, function(err, files) {
			
			if(!err) {
				files.forEach(function(file) {
					var childWatch = cloneWatch(watch);
					if(!err) {
						var link = addWatchToParent(watch, watch.path + '/' + file);
						linkStore[watch.path].push(link);
						allLinks[childWatch.path] = link;
					} else {
						console.error("Error occured when getting child folders of %s - err: %s", childWatch.path, JSON.stringify(err));
					}
				});
			} else {
				console.error('error with accessing the folder: %s', childWatch.path);
			}
		});
	}

	function addWatchToParent(oldWatcher, path) {

		var newWatch = cloneWatch(oldWatcher);
		newWatch.path = path;
		newWatch.mask = newWatch.mask | Inotify.IN_ONLYDIR | CREATED | DELETED;
		var dir = path.replace(oldWatcher.path + '/', '');
		newWatch.callback = newCallback(oldWatcher, dir);

		console.info('add watch to path: %s of dir %s', path, dir);
		return parent.addWatch(newWatch);
	}
}

function cloneWatch(old) {
	var newOne = {
		path: old.path,
		watch_for: old.watch_for,
		callback: old.callback,
		cookie: old.cookie
	}
	return newOne;
}