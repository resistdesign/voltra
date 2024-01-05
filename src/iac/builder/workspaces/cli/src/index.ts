#!/usr/bin/env node
import 'ts-node/register';
import { CLI } from './CLI';

const Package = require('../package.json');

CLI(Package);
