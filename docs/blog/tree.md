# 理解 Vue 递归组件，实现 Tree 树形组件

思考了两天时间，准备仿照 element-plus 实现一个基于 vue3 的树形控件。

主要用到了 vue3 递归组件思想、element-plus 的 el-checkbox 组件，el-collapse-transition 组件折叠动画。

## 需求

- 能够将传入的 Json 数据生成树形目录。
- 能够折叠树形目录。
- 能够初始化选中节点，以及展开激活的节点。
- 能够手动选中节点，能够选中当前列。
- 能够选中子节点后，所有上级节点显示子节点选中样式。
- 能够获取点击的节点，选中的节点，展开的节点。
- 能够通过 id 设置节点选中和节点选中清空。

## 实现后的截图

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/be5413c78ffd4315b4d5f4975b836df5~tplv-k3u1fbpfcp-watermark.image)

## 基础 title 组件 ：treeTitle.vue

```vue
<template>
	<div class="tb-subNode__title" @click="nodeClick(subNode)" :style="isActive ? activeStyle : ''">
		<i
			v-if="showChildren"
			class="el-icon-caret-right el-tree-node__expand-icon"
			:class="isIconExpanded ? 'expanded' : ''"
			@click.stop="handleNodeExpanded(isIconExpanded, subNode)"
		></i>
		<i v-else class="el-icon-caret-right el-tree-node__expand-icon" style="visibility: hidden"></i>
		<template v-if="showCheckbox">
			<el-checkbox
				v-if="showChildren"
				class="tb-subNode__checkbox changeCheckAll"
				:model-value="checked"
				:indeterminate="indeterminate"
				:data-indeterminate="indeterminate"
				@change="changeCheckAll"
			></el-checkbox>
			<el-checkbox v-else :model-value="checked" @change="changeChecked" class="tb-subNode__checkbox"></el-checkbox>
		</template>
		<i class="mr10" :class="subNode.icon" style="font-size: 16px"></i>
		<span class="">{{ subNode[label] }}</span>
		<span v-show="isActive" class="fr" :style="activeStyle">当前组织</span>
	</div>
</template>
<script>
import { computed, inject, watchEffect, watch } from 'vue'
export default {
	name: 'TreeTitle',
	props: {
		subNode: {
			type: Object,
			default: () => {}
		},
		isIconExpanded: {
			type: Boolean,
			default: false
		},
		checked: {
			type: Boolean,
			default: false
		},
		indeterminate: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		'nodeClick',
		'getExpandedNode',
		'handleNodeExpanded',
		'update:modelValue',
		'changeChecked',
		'changeCheckAll',
		'checkedChildren',
		'changeIndeterminate',
		'changeIndeterminateAll',
		'checkChange'
	],
	setup(props, { emit }) {
		const activeId = inject('activeId') //当前激活的组件
		const label = inject('label') //label别名
		const children = inject('children') //children别名
		const activeStyle = inject('activeStyle') //当前激活的组件样式
		const showCheckbox = inject('showCheckbox') //是否现在 checkbox

		const showChildren = computed(() => props.subNode[children] && props.subNode[children].length > 0) //是否存在子节点
		const isActive = computed(() => props.subNode.id === activeId.value) //是否是激活节点
		// 展开/折叠
		const handleNodeExpanded = function (expanded, node) {
			emit('handleNodeExpanded', { expanded: !expanded, node })
		}
		// 点击当前节点
		const nodeClick = function (node) {
			emit('nodeClick', node)
		}

		// 判断 activeId 是否存在 当前 props.submenu中
		const findExpandedMenu = function (node, activeId, children) {
			if (!activeId) return false
			if (node[children] && Array.isArray(node[children])) {
				if (node.id === activeId) return false // 选中为存在 children 的 menu 不展开
				return node[children].some(n => {
					if (n.id === activeId) return true
					if (n[children]) {
						return findExpandedMenu(n, activeId, children)
					}
					return false
				})
			}
			return false
		}

		const shouldExpanded = findExpandedMenu(props.subNode, activeId.value, children)

		shouldExpanded === true && emit('getExpandedNode', { expanded: shouldExpanded, node: props.subNode }) // 传递出需展开元素
		// 切换选中状态/样式
		const changeChecked = checked => {
			// console.log('changeChecked---', props.subNode.id)
			emit('changeChecked', checked)
			emit('changeIndeterminate', { checked, indeterminate: false })
		}

		// 选择当层 - 全选
		const changeCheckAll = checked => {
			emit('changeCheckAll', checked)
			emit('changeIndeterminateAll', { checked, indeterminate: false })
		}

		watchEffect(() => {
			// 带有子元素节点触发
			if (showChildren.value) {
				emit('checkedChildren', props.checked)
				// console.log('checkedChildren---', props.subNode.id, props.checked)
			}
		})
		//监听 indeterminate 和 checked状态
		watch([() => props.indeterminate, () => props.checked], () => {
			// console.log('props.checked---', props.checked)
			emit('checkChange', { checked: props.checked, node: props.subNode, indeterminate: props.indeterminate })
		})
		return {
			activeStyle,
			showCheckbox,
			activeId,
			isActive,
			label,
			showChildren,
			nodeClick,
			handleNodeExpanded,
			changeChecked,
			changeCheckAll
		}
	}
}
</script>

<style lang="scss" scoped>
.tb-subNode__title {
	padding: 10px 5px;
	font-size: 14px;
	overflow: hidden;

	&:hover {
		background: rgb(220 220 220 / 40%);
		cursor: pointer;
	}
	.el-icon-caret-right {
		font-size: 18px;
	}
	.tb-subNode__checkbox {
		display: inline-flex;
		margin-right: 8px !important;
	}
}
</style>
```

## 基础组件（递归组件）：treeItem.vue

```vue
<template>
	<div>
		<TreeTitle
			:style="{ 'padding-left': 15 * idx + 'px' }"
			:subNode="subNode"
			:isIconExpanded="isNodeExpand"
			:checked="checked"
			:indeterminate="indeterminate"
			@nodeClick="nodeClick"
			@getExpandedNode="getExpandedNode"
			@handleNodeExpanded="handleNodeExpanded"
			@changeChecked="changeChecked"
			@changeCheckAll="changeCheckAll"
			@checkedChildren="checkedChildren"
			@changeIndeterminate="changeIndeterminate"
			@changeIndeterminateAll="changeIndeterminateAll"
			@checkChange="checkChange"
		>
		</TreeTitle>
		<el-collapse-transition>
			<div v-show="showChildren">
				<ul class="tb-tree">
					<li class="tb-tree-item" v-for="(node, i) in subNode[children]" :key="node.id">
						<TreeItem
							:ref="el => setItemRef(el, i)"
							:subNode="node"
							:level="idx"
							:checked="checkedList[i]"
							:index="i"
							:indeterminate="indeterminateList[i]"
							@checkChange="checkChange"
							@nodeClick="nodeClick"
							@nodeExpand="nodeExpand"
							@changeChecked="val => changeChecked(val, i)"
							@changeCheckAll="val => changeCheckAll(val, i)"
							@checkedChildren="checkedChildren(checked)"
							@changeIndeterminate="val => changeIndeterminate({ ...val, index: i })"
							@changeIndeterminateAll="val => changeIndeterminateAll({ ...val, index: i })"
						></TreeItem>
					</li>
				</ul>
			</div>
		</el-collapse-transition>
	</div>
</template>

<script>
import { computed, ref, inject } from 'vue'
import TreeTitle from './TreeTitle'

export default {
	name: 'TreeItem',
	components: { TreeTitle },
	props: {
		subNode: {
			type: Object,
			default: () => {}
		},
		level: {
			//当前嵌套深度
			type: Number,
			default: 0
		},
		checked: {
			//当前选中状态
			type: Boolean,
			default: false
		},
		index: {
			//当前深度索引
			type: Number,
			default: 0
		},
		indeterminate: {
			//选中样式
			type: Boolean,
			default: false
		}
	},
	emits: [
		'nodeClick',
		'nodeExpand',
		'changeChecked',
		'changeCheckAll',
		'checkedChildren',
		'changeIndeterminate',
		'changeIndeterminateAll',
		'checkChange'
	],
	setup(props, { emit }) {
		const children = inject('children')
		const isNodeExpand = ref(false)
		const indeterminateList = ref(props.subNode[children] ? props.subNode[children].map(() => false) : [])
		const checkedList = ref(props.subNode[children] ? props.subNode[children].map(() => false) : [])
		const hasChildern = computed(() => props.subNode[children] && props.subNode[children].length > 0)
		const showChildren = computed(() => hasChildern.value && isNodeExpand.value)
		const idx = ref(props.level)
		idx.value += 1

		// 当前节点ref
		const treeItemsRef = ref([])
		const setItemRef = (el, i) => {
			el && (treeItemsRef.value[i] = el)
		}
		// 点击节点
		const nodeClick = function (node) {
			if ('disabled' in node && node.disabled) return false
			emit('nodeClick', node)
		}

		// 获取当前展开元素- 首次展开执行
		const getExpandedNode = function ({ expanded, node }) {
			handleNodeExpanded({ expanded, node })
		}

		// 展开当前节点
		const expandedNode = function ({ expanded }) {
			isNodeExpand.value = expanded
		}

		// 展开时的回调
		const nodeExpand = function ({ expanded, node }) {
			emit('nodeExpand', { expanded, node })
		}

		// 展开回调函数
		const handleNodeExpanded = function ({ expanded, node }) {
			expandedNode({ expanded, node }) // 展开当前节点
			nodeExpand({ expanded, node }) // 展开时的回调
		}

		const changeIndeterminate = ({ checked, indeterminate, index }) => {
			const checkAll = !checkedList.value.includes(false) //子节点全部选中
			const noCheckAll = !checkedList.value.includes(true) //子节点全部未选中
			if (index !== undefined) {
				indeterminateList.value[index] = indeterminate
				const noIndeterminateAll = !indeterminateList.value.includes(true) // 所有子节点全部未设置 indeterminate
				if (checked) {
					// 子节点部分选中!checkAll时，设置 父节点 indeterminate 为 true
					emit('changeIndeterminate', {
						checked,
						indeterminate: !checkAll ? checked : !checked
					})
				} else {
					// 子节点部分未选中!noCheckAll 或者 部分未设置 !noIndeterminateAll 时 ，设置 父节点 indeterminate 为 true
					emit('changeIndeterminate', {
						checked,
						indeterminate: !noCheckAll || !noIndeterminateAll
					})

					// console.log(
					//   'changeIndeterminate---',
					//   noCheckAll,
					//   noIndeterminateAll,
					//   props.subNode.id,
					//   checkedList.value,
					//   indeterminateList.value
					// )
				}
			} else {
				emit('changeIndeterminate', { checked, indeterminate })
			}
		}

		// 选择当层
		const changeChecked = (checked, index) => {
			if (index !== undefined) {
				checkedList.value[index] = checked
				const checkAll = !checkedList.value.includes(false)
				checked
					? checkAll && emit('changeChecked', checked) //全部为true 向上传递
					: !checkAll && emit('changeChecked', checked) //一个为 false 向上传递
			} else {
				//变更当前节点状态
				emit('changeChecked', checked)
			}
		}

		//点击全选节点
		const changeIndeterminateAll = ({ checked, indeterminate, index }) => {
			const checkAll = !checkedList.value.includes(false) //子节点全部选中
			const noCheckAll = !checkedList.value.includes(true) //子节点全部未选中
			//当前节点，向上递归：
			if (index !== undefined) {
				indeterminateList.value[index] = indeterminate //更改当前节点 indeterminate
				if (checked) {
					// 父节点 checked 处于选中
					// 当前节点的父节点的子节点为全部选中，则此设置父节点的 indeterminate 为 false
					emit('changeIndeterminateAll', {
						checked,
						indeterminate: checkAll ? !checked : checked
					})
				} else {
					// 取消选中
					if (noCheckAll) {
						//子节点全部未选中
						emit('changeIndeterminateAll', {
							checked, // 父节点选中状态
							indeterminate // 点击全选或者取消全选 indeterminate 都为 false
						})
					} else {
						// console.log('---------------', checked, indeterminate, props.subNode.id)
						// 子节点部分为选中
						emit('changeIndeterminateAll', {
							checked: !checked, // 父节点选中状态
							indeterminate: !indeterminate // 点击取消选中时，子节点部分为选中， 父节点indeterminate都为 true
						})
					}
				}
			} else {
				// 向上传递 checked ，indeterminate，让父节点更改 indeterminate
				emit('changeIndeterminateAll', {
					checked,
					indeterminate
				})
			}
		}

		// 选择当层 - 全选
		const changeCheckAll = (checked, index) => {
			//事件传递从最外层开始向最内层出发，事件传递由内往外
			//当前节点向上传递的节点
			if (index !== undefined) {
				checkedList.value[index] = checked // 切换当前节点状态
				const checkAll = !checkedList.value.includes(false) // 子节点全选
				checked
					? checkAll && emit('changeCheckAll', checked) //当前节点将为true,子节点全选为 再向上传递当前节点状态true
					: !checkAll && emit('changeCheckAll', checked) //当前节点将为false,子节点未全选 再向上传递当前节点状态false
			} else {
				//取消
				// 变更当前节点状态，以及当前子节点状态，
				checkedList.value.fill(checked)
				emit('changeCheckAll', checked)
			}
			// console.log('checkAll---', checked, props.subNode.id)
		}

		//选中子元素-所有相关父节点回调触发
		const checkedChildren = checked => {
			if (checked) {
				//全选
				checkedList.value.fill(checked)
				indeterminateList.value.fill(!checked) //  indeterminateList false
			} else {
				//取消全选 - 取消更深层子节点选中状态
				!checkedList.value.includes(false) && checkedList.value.fill(checked)
			}
			// console.log(checked, props.subNode.id, checkedList.value)
		}

		const checkChange = ({ checked, node, indeterminate }) => {
			emit('checkChange', { checked, node, indeterminate })
		}

		// 设置keys节点选中
		const setCheckedKeys = (keys = []) => {
			const nodes = props.subNode[children] || []
			checkedList.value.fill(false)
			indeterminateList.value.fill(false)

			if (keys.length > 0 && showChildren) {
				const checkedKyes = keys.reduce((pre, key) => {
					const cur = nodes.find((node, i) => {
						if (node.id === key) {
							!checkedList.value[i] && (checkedList.value[i] = true)
							return true
						}
						return false
					})
					return cur ? [...pre, cur] : pre
				}, [])
				// console.log('setCheckedKeys---1', checkedKyes, props.subNode.id, checkedList.value.includes(false))
				// 当前子节点选中

				if (checkedKyes.length > 0) {
					if (!checkedList.value.includes(false)) {
						//子节点全选
						emit('changeCheckAll', true, props.index)
						emit('changeIndeterminateAll', { checked: true, indeterminate: false })
					} else {
						//子节点单选
						emit('changeIndeterminate', { checked: true, indeterminate: true, index: props.index })
					}
				}
			}
			//存在子元素
			nodes.length > 0 && treeItemsRef.value.forEach(async itemRef => await itemRef.setCheckedKeys(keys))
		}

		return {
			treeItemsRef,
			setItemRef,
			idx,
			isNodeExpand,
			checkedList,
			hasChildern,
			showChildren,
			indeterminateList,
			getExpandedNode,
			children,
			nodeClick,
			nodeExpand,
			expandedNode,
			checkedChildren,
			handleNodeExpanded,
			changeChecked,
			changeCheckAll,
			changeIndeterminate,
			changeIndeterminateAll,
			checkChange,
			setCheckedKeys
		}
	}
}
</script>

<style lang="scss" scoped>
.tb-tree {
	border: none;
	height: 100%;
	width: 100%;
}
</style>
```

## 入口组件 index.vue

- 主要向外暴露出方法

```vue
<template>
	<div class="tree-container">
		<template v-for="(node, i) in data" :key="node.id">
			<TreeItem
				:ref="el => setItemRef(el, i)"
				:subNode="node"
				:checked="checkedList[i]"
				:index="i"
				:indeterminate="indeterminateList[i]"
				@nodeClick="nodeClick"
				@nodeExpand="nodeExpand"
				@changeChecked="val => changeChecked(val, i)"
				@changeCheckAll="val => changeCheckAll(val, i)"
				@changeIndeterminate="val => changeIndeterminate({ ...val, index: i })"
				@changeIndeterminateAll="val => changeIndeterminateAll({ ...val, index: i })"
				@checkChange="checkChange"
			></TreeItem>
		</template>
	</div>
</template>

<script>
import { computed, onMounted, provide, ref } from 'vue'
import TreeItem from './TreeItem'

export default {
	name: 'TBTree',
	components: { TreeItem },
	props: {
		data: {
			// 节点列表
			type: Array,
			default: () => []
		},
		activeId: {
			// 选中节点
			type: String,
			default: ''
		},
		idxPaddingLeft: {
			type: Number || String,
			default: 0
		},
		props: {
			// 参数别名
			type: Object,
			default: () => {}
		},
		activeStyle: {
			//选中节点样式
			type: Object,
			default: () => ({
				color: '#3b83ee'
			})
		},
		showCheckbox: {
			// 是否使用复选框
			type: Boolean,
			default: false
		}
	},
	emits: ['nodeClick', 'nodeExpand', 'checkChange'],
	setup(props, { emit }) {
		const defaultAlias = {
			label: 'label',
			children: 'children',
			disabled: 'disabled'
		}
		const propsAlias = { ...defaultAlias, ...props.props }
		const activeId = computed(() => props.activeId)
		const checkedList = ref(props.data.map(() => false))
		const indeterminateList = ref(props.data.map(() => false))
		provide('activeId', activeId)
		provide('label', propsAlias.label)
		provide('children', propsAlias.children)
		provide('activeStyle', props.activeStyle)
		provide('showCheckbox', props.showCheckbox)
		//选中节点Keys
		const checkedKeys = []
		// 当前节点ref
		const treeItemsRef = ref([])
		const setItemRef = (el, i) => {
			el && (treeItemsRef.value[i] = el)
		}
		// 点击节点回调
		const nodeClick = function (node) {
			if ('disabled' in node && node.disabled) return false
			emitsHandler('nodeClick', node)
		}

		// 展开时的回调
		const nodeExpand = function ({ expanded, node }) {
			emitsHandler('nodeExpand', expanded, node)
		}

		// 单选
		const changeChecked = (checked, index) => {
			checkedList.value[index] = checked
			// console.log('changeChecked---0:', index, checked, checkedList.value)
		}

		// 全选
		const changeCheckAll = (checked, index) => {
			checkedList.value[index] = checked
			// console.log('changeCheckAll---0:', index, checked, checkedList.value)
		}

		// 选择中样式
		const changeIndeterminate = ({ checked, indeterminate, index }) => {
			indeterminateList.value[index] = indeterminate
		}

		// 全选样式
		const changeIndeterminateAll = ({ checked, indeterminate, index }) => {
			indeterminateList.value[index] = indeterminate
			// console.log('changeIndeterminateAll---', checked, indeterminate, props.data[index])
		}

		// 节点check状态发生变化时的回调
		const checkChange = ({ checked, node, indeterminate }) => {
			// console.log(checked, node.id, indeterminate)
			changeCheckedKeys(checkedKeys, checked, node)
			emitsHandler('checkChange', node, checked, indeterminate)
		}

		// 设置keys节点选中
		const setCheckedKeys = (keys = []) => {
			const nodes = props.data
			checkedList.value.fill(false)
			indeterminateList.value.fill(false)
			if (keys.length > 0) {
				keys.reduce((pre, key) => {
					const cur = nodes.find((node, i) => {
						if (node.id === key) {
							!checkedList.value[i] && (checkedList.value[i] = true)
							return true
						}
						return false
					})
					return cur ? [...pre, cur] : pre
				}, [])
			}
			//存在子元素
			nodes.length > 0 && treeItemsRef.value.forEach(itemRef => itemRef.setCheckedKeys(keys))
		}

		// 获取选中节点的keys
		const getCheckedKeys = () => checkedKeys

		// emit 事件统一处理
		const emitsHandler = (emitName, ...args) => {
			emit(emitName, ...args)
		}

		// 设置选中节点keys
		function changeCheckedKeys(checkedKeys, checked, node) {
			const index = checkedKeys.indexOf(node.id)
			if (checked) {
				index === -1 && checkedKeys.push(node.id)
			} else {
				index !== -1 && checkedKeys.splice(index, 1)
			}
		}

		return {
			treeItemsRef,
			setItemRef,
			indeterminateList,
			nodeClick,
			nodeExpand,
			checkedList,
			checkChange,
			changeChecked,
			changeCheckAll,
			changeIndeterminate,
			changeIndeterminateAll,
			getCheckedKeys,
			setCheckedKeys,
			emitsHandler
		}
	}
}
</script>

<style lang="scss" scoped>
.tb-tree {
	border: none;
	height: 100%;
	width: 100%;
}
</style>
```

## 应用组件：tree-apply.vue

```vue
<template>
	<div>
		<TBTree
			ref="TBTreeRef"
			:data="projectMenu"
			:activeId="activeProjectMenu.id"
			:props="{
				label: 'menuName'
			}"
			showCheckbox
			@nodeClick="handleNode"
			@nodeExpand="nodeExpand"
			@checkChange="checkChange"
		>
		</TBTree>
		<el-button type="primary" @click="getCheckedKeys">获取选中节点</el-button>
		<el-button type="primary" @click="setCheckedKeys">设置节点选中</el-button>
		<el-button type="primary" @click="resetChecked">清空选中</el-button>
	</div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
	name: 'demo',
	setup() {
		const activeProjectMenu = reactive({
			icon: 'el-icon-office-building',
			menuName: '第一工程处-1-1-2-3-2',
			id: '1-1-2-3-2'
		})

		const projectMenu = ref([
			{
				icon: 'el-icon-office-building',
				menuName: '第一工程处-1',
				id: '1',
				children: [
					{
						icon: 'el-icon-office-building',
						menuName: '第一工程处1-1',

						id: '1-1',
						children: [
							{
								icon: 'el-icon-office-building',
								menuName: '第一工程处-1-1-1',

								id: '1-1-1'
							},
							{
								icon: 'el-icon-office-building',
								menuName: '第一工程处-1-1-2',

								id: '1-1-2',
								children: [
									{
										icon: 'el-icon-office-building',
										menuName: '第一工程处-1-1-2-1',

										id: '1-1-2-1'
									},
									{
										icon: 'el-icon-office-building',
										menuName: '第一工程处-1-1-2-2',
										disabled: true,
										id: '1-1-2-2'
									},
									{
										icon: 'el-icon-office-building',
										menuName: '第一工程处-1-1-2-3',
										id: '1-1-2-3',
										children: [
											{
												icon: 'el-icon-office-building',
												menuName: '第一工程处-1-1-2-3-1',
												id: '1-1-2-3-1',
												children: [
													{
														icon: 'el-icon-office-building',
														menuName: '第一工程处-1-1-2-3-1-1',
														id: '1-1-2-3-1-1'
													},
													{
														icon: 'el-icon-office-building',
														menuName: '第一工程处-1-1-2-3-1-2',
														id: '1-1-2-3-1-2'
													}
												]
											},
											{
												icon: 'el-icon-office-building',
												menuName: '第一工程处-1-1-2-3-2',
												disabled: true,
												id: '1-1-2-3-2'
											}
										]
									}
								]
							},
							{
								icon: 'el-icon-office-building',
								menuName: '第一工程处-1-1-3',

								id: '1-1-3',
								children: [
									{
										icon: 'el-icon-office-building',
										menuName: '第一工程处-1-1-3-1',

										id: '1-1-3-1'
									},
									{
										icon: 'el-icon-office-building',
										menuName: '第一工程处-1-1-3-2',

										disabled: true,
										id: '1-1-3-2'
									}
								]
							}
						]
					},
					{
						icon: 'el-icon-office-building',
						menuName: '第一工程处1-2',

						id: '1-2'
					}
				]
			},
			{
				icon: 'el-icon-office-building',
				menuName: '第二工程处-2',

				id: '2',
				children: [
					{
						icon: 'el-icon-office-building',
						menuName: '第二工程处2-1',

						id: '2-1'
					},
					{
						icon: 'el-icon-office-building',
						menuName: '第二工程处2-2',

						id: '2-2'
					}
				]
			},
			{
				icon: 'el-icon-office-building',
				menuName: '第二工程处-3',

				id: '3'
			}
		])

		const TBTreeRef = ref(null)

		//点击回调
		function handleNode(node) {
			// console.log('点击节点回调--', node)
			activeProjectMenu.icon = node.icon
			activeProjectMenu.menuName = node.menuName
			activeProjectMenu.isActive = node.isActive
			activeProjectMenu.id = node.id
		}

		//展开回调
		function nodeExpand(expanded, node) {
			// console.log('展开节点回调--', { expanded, node })
		}

		//选中状态变化回调
		function checkChange(node, checked, indeterminate) {
			// console.log(node, checked, indeterminate)
		}

		//获取选中节点
		function getCheckedKeys() {
			const nodeKeys = TBTreeRef.value.getCheckedKeys()
			console.log('nodeKeys---', nodeKeys)
		}

		//设置节点选中
		function setCheckedKeys() {
			TBTreeRef.value.setCheckedKeys(['1-1-2-1', '1-1-2-3-1', '1-1-2-3-2', '3', '1-1-3-1', '1-1-3-2'])
		}

		// 清空节点
		function resetChecked() {
			TBTreeRef.value.setCheckedKeys([])
		}

		return {
			TBTreeRef,
			activeProjectMenu,
			projectMenu,
			handleNode,
			nodeExpand,
			checkChange,
			getCheckedKeys,
			setCheckedKeys,
			resetChecked
		}
	}
}
</script>
```

## 总结

到此就完成了树形控件的生成，需求都已经满足。

如果通过以上代码片段不能明白的话，可以在我的 github 上找到源码。欢迎来访，欢迎 Star~  
[vue3-elementplus-admin](https://gitee.com/ifredom/vue3-elementplus-admin)
